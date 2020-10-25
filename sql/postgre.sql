DROP TABLE IF EXISTS Bids;
DROP TABLE IF EXISTS CareTakerAvailability;
DROP TABLE IF EXISTS CareTakerPricing;
DROP TABLE IF EXISTS PetSpecialRequirements;
DROP TABLE IF EXISTS Pet;
DROP TABLE IF EXISTS PetTypes;
DROP TABLE IF EXISTS PetOWner;
DROP TABLE IF EXISTS CareTaker;
DROP TABLE IF EXISTS PCSAdmin;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS SpecialRequirements;
DROP TYPE IF EXISTS transfer_methods;
DROP TYPE IF EXISTS payment_types;
DROP TYPE IF EXISTS Bidstatus;
CREATE TABLE PCSAdmin
(
    username VARCHAR(64) PRIMARY KEY,
    password VARCHAR NOT NULL,
    enabled  BOOLEAN DEFAULT TRUE
);

CREATE TABLE Users
(
    username VARCHAR(64) PRIMARY KEY,
    password VARCHAR     NOT NULL,
    name     VARCHAR(64) NOT NULL,
    area     VARCHAR(64) NULL,
    enabled  BOOLEAN DEFAULT TRUE
);

CREATE TABLE PetOwner
(
    username VARCHAR(64) PRIMARY KEY,
    credit_card_number NUMERIC(20) DEFAULT NULL,
    FOREIGN KEY (username) REFERENCES Users (username) ON UPDATE CASCADE
);

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


CREATE TABLE CareTaker
(
    username    VARCHAR(64) PRIMARY KEY,
    is_fulltime BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (username) REFERENCES Users (username) ON UPDATE CASCADE
);

CREATE TABLE PetTypes
(
    name VARCHAR(64) PRIMARY KEY,
    base_price NUMERIC(10,2) NOT NULL
);


CREATE TABLE SpecialRequirements
(
    description VARCHAR PRIMARY KEY
);

CREATE TABLE Pet
(
    owner_username VARCHAR(64),
    name           VARCHAR(64),
    enabled        BOOLEAN DEFAULT TRUE,
    pet_type       VARCHAR(64) NOT NULL,
    PRIMARY KEY (owner_username, name),
    FOREIGN KEY (owner_username) REFERENCES PetOwner (username) ON UPDATE CASCADE,
    FOREIGN KEY (pet_type) REFERENCES PetTypes (name) ON UPDATE CASCADE
);

CREATE TABLE PetSpecialRequirements
(
    owner_username       VARCHAR(64),
    name                 VARCHAR(64),
    special_requirements VARCHAR,
    PRIMARY KEY (owner_username, name, special_requirements), 
    FOREIGN KEY (owner_username, name) REFERENCES Pet (owner_username, name) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (special_requirements) REFERENCES SpecialRequirements (description) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE CareTakerPricing
(
    username VARCHAR(64),
    pet_type VARCHAR(64),
    price    DECIMAL(8, 2),
    PRIMARY KEY (username, pet_type),
    FOREIGN KEY (username) REFERENCES CareTaker (username) ON UPDATE CASCADE,
    FOREIGN KEY (pet_type) REFERENCES PetTypes (name) ON UPDATE CASCADE
);

CREATE TABLE CareTakerAvailability
(
    username VARCHAR(64),
    date     DATE NOT NULL,
    PRIMARY KEY (username, date),
    FOREIGN KEY (username) REFERENCES CareTaker (username) ON UPDATE CASCADE
);

CREATE TYPE transfer_methods AS ENUM ('OWNER_DELIVER', 'CARETAKER_PICKUP', 'PCS_BUILDING');
CREATE TYPE payment_types AS ENUM ('CREDIT_CARD', 'CASH');

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


CREATE OR REPLACE FUNCTION ABLETOCAREFOR(pet_name VARCHAR, owner_name VARCHAR, caretaker_username VARCHAR) 
    RETURNS BOOLEAN AS 
    $$ BEGIN
        RETURN EXISTS (
            SELECT 1 
            FROM pet P, CareTakerPricing C
            WHERE pet_name = P.name AND owner_name = P.owner_username AND P.pet_type = C.pet_type AND caretaker_username = C.username
            );
    END;
$$
LANGUAGE plpgsql;

CREATE TYPE bidstatus AS ENUM ('ACCEPTED', 'PENDING', 'REJECTED');

CREATE TABLE Bids
(
    status      bidstatus         DEFAULT 'PENDING' NOT NULL,
    rating          SMALLINT         DEFAULT NULL CHECK (rating >= 0 AND rating <= 5),
    review          VARCHAR          DEFAULT NULL,
    total_price           DECIMAL(8, 2),
    transfer_method transfer_methods DEFAULT NULL,
    payment_type    payment_types    DEFAULT NULL,
    owner_username  VARCHAR(64),
    pet_name        VARCHAR(64),
    caretaker_username    VARCHAR(64),
    start_date      DATE  NOT NULL,
    end_date DATE NOT NULL,

    PRIMARY KEY (owner_username, pet_name, caretaker_username, start_date, end_date),
    FOREIGN KEY (owner_username, pet_name) REFERENCES Pet (owner_username, name) ON UPDATE CASCADE,
    FOREIGN KEY (caretaker_username, start_date) REFERENCES CareTakerAvailability (username, date) ON UPDATE CASCADE,
    FOREIGN KEY (caretaker_username, end_date) REFERENCES CareTakerAvailability(username, date) ON UPDATE CASCADE,
    CONSTRAINT LEGALTIMEPERIOD CHECK (start_date <= end_date),
    CONSTRAINT ABLETOCAREFOR CHECK (ABLETOCAREFOR(pet_name, owner_username, caretaker_username)),
    CONSTRAINT NOFALSERATINGS CHECK (status = 'ACCEPTED' OR (rating IS NULL AND review IS NULL AND transfer_method IS NULL AND payment_type IS NULL))
);

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

CREATE OR REPLACE FUNCTION GET_PETS_TAKEN_CARE_BY(caretaker VARCHAR, dateToCheck DATE)
    RETURNS INTEGER LANGUAGE plpgsql AS $$
        BEGIN 
            RETURN (SELECT COUNT (*) FROM Bids 
            WHERE caretaker = caretaker_username AND status = 'ACCEPTED' AND (dateToCheck BETWEEN start_date AND end_date));
        END; 
$$;



CREATE OR REPLACE FUNCTION GET_PRICE(pet_type VARCHAR, rating NUMERIC(3,2))
    RETURNS NUMERIC(3,2) LANGUAGE plpgsql AS $$
        BEGIN 
            RETURN (SELECT CASE  WHEN rating>=4.5 THEN P.base_price*1.5
                            WHEN rating >= 4 THEN P.base_price*1.25
                            ELSE P.base_price 
                            END 
                FROM PetTypes P
                WHERE P.name = pet_type);
        END;
$$;

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

CREATE OR REPLACE FUNCTION CHECKBEFOREINSERTBID()
    RETURNS TRIGGER LANGUAGE plpgsql
    AS $$
    DECLARE able BOOLEAN;
    DECLARE rating NUMERIC;
    DECLARE fulltime BOOLEAN;
    BEGIN 
    able := (SELECT NOT EXISTS (SELECT 1
                    FROM Bids B
                    WHERE B.status = 'ACCEPTED' AND B.pet_name = NEW.pet_name AND B.owner_username = NEW.owner_username 
                        AND (NEW.start_date, NEW.end_date + interval '1 day') OVERLAPS (B.start_date, B.end_date + interval '1 day')
                    ));
    IF NOT able THEN
        RAISE EXCEPTION 'YOU ALREADY HAVE ACCEPTED BID OVERLAPPING!';
    END IF;

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
        NEW.status := 'REJECTED';
    ELSE 

        NEW.total_price := 
            (SELECT price * (DATE_PART('day',NEW.end_date::timestamp - NEW.start_date::timestamp) + 1)
                FROM CareTakerPricing C, Pet P
                WHERE NEW.pet_name = P.name AND NEW.owner_username = P.owner_username 
                    AND P.pet_type = C.pet_type AND C.username = NEW.caretaker_username);
        IF fulltime THEN
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
        able := (SELECT NOT EXISTS (SELECT 1
                    FROM Bids B
                    WHERE B.status = 'ACCEPTED' AND B.pet_name = OLD.pet_name AND B.owner_username = OLD.owner_username 
                        AND (OLD.start_date, OLD.end_date + interval '1 day') OVERLAPS (B.start_date, B.end_date + interval '1 day')
                        AND NOT (OLD.caretaker_username = B.caretaker_username AND OLD.start_date = B.start_date AND OLD.end_date = B.end_date)
                    ));
        IF NOT able THEN
        RAISE EXCEPTION 'YOU ALREADY HAVE ACCEPTED BID OVERLAPPING!';
        END IF;

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

         RAISE NOTICE '% rows have been changed form pending to rejected', initial - (SELECT COUNT(*) FROM Bids WHERE status = 'PENDING');
    END IF;
    RETURN NULL;
    END; $$;

CREATE TRIGGER CHECKAFTERBID AFTER UPDATE OR INSERT ON Bids
FOR EACH ROW EXECUTE PROCEDURE DOAFTERBID();

DO $$
    BEGIN
        for r in 1..1000 loop
            insert into Users (username, name, password) values(r, 'John', cast (r as VARCHAR));
        end loop;
    END;
$$; 


DO $$
    DECLARE count INTEGER;   
    BEGIN
        count := 400;
        WHILE count<= 800 LOOP
            INSERT INTO CareTaker (username, is_fulltime) VALUES(count, mod(count,2) =0);
                count := count + 1;
        END LOOP;
    END;
$$;

    
CREATE OR REPLACE FUNCTION list_of_pet_types() 
    RETURNS varchar[] AS $$
        BEGIN
            return array['dog', 'cat', 'hamster', 'bird', 'big bird', 'small bird', 'tiger', 'lion', 'elephant'];
        END;
    $$
LANGUAGE plpgsql;

do $$
    declare types varchar[];
    declare var varchar;
    declare prices NUMERIC(10,2)[];
    declare ind INTEGER;
    BEGIN
        types := list_of_pet_types();
        ind := 0;
        prices := array[40.50, 89.1, 100, 200, 154.2, 167.2, 10.3, 18.5, 20.1];
        FOREACH var in ARRAY types LOOP
            ind := ind+1;
            INSERT INTO PetTypes (name, base_price) VALUES(var, prices[ind]);
        END LOOP;
    END;
$$;



DO $$
    DECLARE count INTEGER;
    DECLARE pet INTEGER;
    BEGIN
        count := 1;
        WHILE count<= 50 LOOP
            pet:=1;
            WHILE pet <=20 LOOP
                INSERT INTO Pet (owner_username,name, pet_type) 
                    VALUES(count, pet,  (list_of_pet_types())[mod(pet, array_length(list_of_pet_types(),1))+1] );
                pet := pet + 1;
            END LOOP;
            count := count + 1;
        END LOOP;
    END;
$$;

DO $$
    DECLARE count INTEGER;
    BEGIN 
        count := 400;
        WHILE count < 800 LOOP
            INSERT INTO CareTakerPricing(username, pet_type, price) 
                VALUES (count, (list_of_pet_types())[mod(count, array_length(list_of_pet_types(),1))+1], count/23);
            count := count +1;
        END LOOP;
    END;
$$;


INSERT INTO CARETAKERAVAILABILITY(username, date) VALUES ('401', '2020-08-09');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('6','4','400','2020-08-09', '2020-09-20');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('1','5','401','2020-08-09', '2020-08-09');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('2','5','401','2020-08-09', '2020-08-09');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('3','5','401','2020-08-09', '2020-08-09');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('4','5','401','2020-08-09', '2020-08-09');
UPDATE Bids SET status = 'ACCEPTED' WHERE owner_username = '1';
