

--Get a rating of a particular caretaker
CREATE OR REPLACE FUNCTION GET_RATING(username VARCHAR) 
    RETURNS NUMERIC(3,2) LANGUAGE plpgsql AS
    $$ BEGIN
        RETURN (SELECT CASE 
                    WHEN COUNT(*) = 0 THEN 3.00
                    ELSE AVG(rating)::numeric(3,2)
                END
            FROM Bids
            WHERE caretaker_username = username AND rating IS NOT NULL);
    END;
$$;

--get the number of pets currently cared for by a caretaker on a particular date
CREATE OR REPLACE FUNCTION GET_PETS_TAKEN_CARE_BY(caretaker VARCHAR, dateToCheck DATE)
    RETURNS INTEGER LANGUAGE plpgsql AS $$
        BEGIN 
            RETURN (SELECT COUNT (*) FROM Bids 
            WHERE caretaker = caretaker_username AND status = 'ACCEPTED' AND (dateToCheck BETWEEN start_date AND end_date));
        END; 
$$;


--get the default price of a pet by a caretaker of a particular rating
CREATE OR REPLACE FUNCTION GET_PRICE(ptype VARCHAR, rating NUMERIC(3,2))
    RETURNS NUMERIC(3,2) LANGUAGE plpgsql AS $$
        BEGIN 
            RETURN (SELECT CASE  WHEN rating>=4.5 THEN P.base_price*1.5
                            WHEN rating >= 4 THEN P.base_price*1.25
                            ELSE P.base_price 
                            END 
                FROM PetTypes P
                WHERE P.pet_type = ptype);
        END;
$$;

--------------------------------------------------

--trigger to autoset prices whenever a new pet is added to be cared for
CREATE OR REPLACE FUNCTION SET_PRICE()
    RETURNS TRIGGER LANGUAGE plpgsql
    AS $$
        DECLARE rating NUMERIC(3,2);
    BEGIN 
        rating := GET_RATING(NEW.username);
        NEW.price := GET_PRICE(NEW.pet_type, rating);
        RETURN NEW;
    END;
$$;


CREATE TRIGGER INSERT_PRICE BEFORE INSERT ON CareTakerPricing
FOR EACH ROW EXECUTE PROCEDURE SET_PRICE();

--set new prices whenever rating is updated
CREATE OR REPLACE FUNCTION SET_NEW_PRICES() 
    RETURNS TRIGGER LANGUAGE plpgsql
    AS $$
    DECLARE NEW_RATING NUMERIC(3,2);
    BEGIN
        IF NEW.rating IS NOT NULL AND (SELECT is_fulltime FROM Caretaker C Where C.username = NEW.caretaker_username) THEN
            NEW_RATING := GET_RATING(NEW.caretaker_username);
            Update CareTakerPricing
            SET price = 
                CASE 
                    WHEN username = NEW.caretaker_username THEN GET_PRICE(pet_type, NEW_RATING) 
                ELSE price 
                END ;
        END IF;
    RETURN NEW;
    END;
$$;


CREATE TRIGGER UPDATE_PRICE AFTER UPDATE OR INSERT ON Bids
    FOR EACH ROW EXECUTE PROCEDURE SET_NEW_PRICES();

--checks to be done before the bid is inserted
CREATE OR REPLACE FUNCTION CHECKBEFOREINSERTBID()
    RETURNS TRIGGER LANGUAGE plpgsql
    AS $$
    DECLARE able BOOLEAN;
    DECLARE rating NUMERIC;
    DECLARE fulltime BOOLEAN;
    BEGIN 
    -- check for overlapping bids with the same pet that is already accepted
    able := (SELECT NOT EXISTS (SELECT 1
                    FROM Bids B
                    WHERE B.status = 'ACCEPTED' AND B.pet_name = NEW.pet_name AND B.owner_username = NEW.owner_username 
                        AND (NEW.start_date, NEW.end_date + interval '1 day') OVERLAPS (B.start_date, B.end_date + interval '1 day')
                    ));
    IF NOT able THEN
        RAISE EXCEPTION 'YOU ALREADY HAVE ACCEPTED BID OVERLAPPING!';
    END IF;
    --check for caretaker availability
    able := (SELECT NOT EXISTS (SELECT 1 
                                FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') AS t(day)
                                WHERE NOT EXISTS ( SELECT 1 
                                                    FROM CareTakerAvailability A
                                                    WHERE A.date = t.day AND A.username = NEW.caretaker_username
                                                    )
                                ));
    IF NOT able THEN
        RAISE EXCEPTION 'Caretaker unavailable on one of those days!';
    END IF;
    --check whether the caretaker is still able to take more pets

    fulltime = (SELECT is_fulltime FROM CareTaker WHERE username = NEW.caretaker_username);
    rating = GET_RATING(NEW.caretaker_username);
    able := (SELECT (SELECT CASE WHEN fulltime THEN 5
                 WHEN rating > 4.5 THEN 5
                 WHEN rating > 4 THEN 4
                 WHEN rating > 3.5 THEN 3
                ELSE 2
                END ) > ALL(SELECT GET_PETS_TAKEN_CARE_BY(NEW.caretaker_username,t.day::date)
                        FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') AS t(day)));
    IF NOT able THEN
        RAISE NOTICE 'Caretaker already full on one of the days! Auto rejecting bid';
        NEW.status := 'REJECTED';
    ELSE 
        --calculate total price of the bid
        NEW.total_price := 
            (SELECT price * (DATE_PART('day',NEW.end_date::timestamp - NEW.start_date::timestamp) + 1)
                FROM CareTakerPricing C, Pet P
                WHERE NEW.pet_name = P.name AND NEW.owner_username = P.owner_username 
                    AND P.pet_type = C.pet_type AND C.username = NEW.caretaker_username);
        IF fulltime THEN
            --autoaccept if fulltime and able
            NEW.status := 'ACCEPTED';
        END IF;
    END IF;
    RETURN NEW;
END; $$;

    

CREATE TRIGGER CHECKBID BEFORE INSERT ON Bids
FOR EACH ROW EXECUTE PROCEDURE CHECKBEFOREINSERTBID();



CREATE OR REPLACE FUNCTION CHECKBEFOREUPDATEBID()
    RETURNS TRIGGER LANGUAGE plpgsql
    AS $$
    DECLARE able BOOLEAN;
    DECLARE rating NUMERIC;
    DECLARE fulltime BOOLEAN;
    BEGIN 
    IF OLD.Status <> 'ACCEPTED' AND NEW.STATUS = 'ACCEPTED' THEN
        --check for autolapping bids that involve the same pet that has already been accepted
        able := (SELECT NOT EXISTS (SELECT 1
                    FROM Bids B
                    WHERE B.status = 'ACCEPTED' AND B.pet_name = OLD.pet_name AND B.owner_username = OLD.owner_username 
                        AND (OLD.start_date, OLD.end_date + interval '1 day') OVERLAPS (B.start_date, B.end_date + interval '1 day')
                        AND NOT (OLD.caretaker_username = B.caretaker_username AND OLD.start_date = B.start_date AND OLD.end_date = B.end_date)
                    ));
        IF NOT able THEN
        RAISE EXCEPTION 'YOU ALREADY HAVE ACCEPTED BID OVERLAPPING!';
        END IF;

        --check if caretaker can indeed care for so many
        fulltime = (SELECT is_fulltime FROM CareTaker WHERE username = NEW.caretaker_username);
        rating = GET_RATING(NEW.caretaker_username);
    
        able := (SELECT (SELECT CASE WHEN fulltime THEN 5
                 WHEN rating > 4.5 THEN 5
                 WHEN rating > 4 THEN 4
                 WHEN rating > 3.5 THEN 3
                ELSE 2
                END ) > ALL(SELECT GET_PETS_TAKEN_CARE_BY(NEW.caretaker_username,t.day::date)
                        FROM generate_series(NEW.start_date, NEW.end_date, interval '1 day') AS t(day)));
        IF NOT able THEN
        RAISE EXCEPTION 'Caretaker already care for too many!';         
        END IF;
    END IF;
    RETURN NEW;
    END; $$;

CREATE TRIGGER CHECKBIDUPDATE BEFORE UPDATE ON Bids
FOR EACH ROW EXECUTE PROCEDURE CHECKBEFOREUPDATEBID();


CREATE OR REPLACE FUNCTION DOAFTERBID()
    RETURNS TRIGGER LANGUAGE plpgsql
    AS $$
    DECLARE able BOOLEAN;
    DECLARE rating NUMERIC;
    DECLARE fulltime BOOLEAN;
    DECLARE initial INTEGER;
    BEGIN 
    
    IF NEW.Status = 'ACCEPTED' THEN
        initial := (SELECT COUNT(*) FROM Bids WHERE status = 'PENDING');
        --auto reject pending bids that caretaker is now too busy to take care of
        Update Bids B
        SET status = 'REJECTED'
        WHERE status = 'PENDING' AND ((B.pet_name = NEW.pet_name AND B.owner_username = NEW.owner_username AND 
        (NEW.start_date, NEW.end_date + interval '1 day') OVERLAPS (B.start_date, B.end_date + interval '1 day'))
        OR ((SELECT CASE WHEN C.is_fulltime THEN 5
                 WHEN get_rating(C.username) > 4.5 THEN 5
                 WHEN get_rating(C.username) > 4 THEN 4
                 WHEN get_rating(C.username) > 3.5 THEN 3
                ELSE 2
                END
                FROM caretaker C 
                WHERE C.username = B.caretaker_username) <= ANY(SELECT GET_PETS_TAKEN_CARE_BY(B.caretaker_username,t.day::date)
                        FROM generate_series(B.start_date, B.end_date, interval '1 day') AS t(day))
                        ));
        --shows how many bids have been autorejected
         RAISE NOTICE '% rows have been changed form pending to rejected', initial - (SELECT COUNT(*) FROM Bids WHERE status = 'PENDING');
    END IF;
    RETURN NULL;
    END; $$;

CREATE TRIGGER CHECKAFTERBID AFTER UPDATE OR INSERT ON Bids
FOR EACH ROW EXECUTE PROCEDURE DOAFTERBID();



--------------------------------------------------------------

--automatically fillup availability if caretaker is fulltime
CREATE OR REPLACE FUNCTION FillUpAvailability() 
    RETURNS TRIGGER AS $$ 
    BEGIN
        INSERT INTO CareTakerAvailability(username, date) 
        SELECT C.username, t.day::date
        FROM generate_series(timestamp '2020-01-01', timestamp '2020-12-31', interval '1 day') AS t(day), CareTaker AS C 
        WHERE C.username = NEW.username;
        
        RETURN NEW;
    END;
$$
LANGUAGE plpgsql;



CREATE TRIGGER FillAvailability AFTER INSERT ON CareTaker
    FOR EACH ROW 
    WHEN (NEW.is_fulltime = TRUE)
    EXECUTE PROCEDURE FillUpAvailability();

-----------------------------------------------------------------

    -- automaticallly create a pet owner upon account creation
CREATE OR REPLACE FUNCTION insert_pet_owner()
    RETURNS TRIGGER LANGUAGE plpgsql
    AS $$ 
    BEGIN
        INSERT INTO PetOwner(username) VALUES (NEW.username);
        RETURN NEW;
    END;
$$;

CREATE TRIGGER INSERT_ON_CREATION AFTER INSERT ON Users
    FOR EACH ROW EXECUTE PROCEDURE insert_pet_owner();