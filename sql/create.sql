--generate dummy users
DO $$
    BEGIN
        for r in 1..1000 loop
            insert into Users (username, name, password) values(r, 'John', cast (r as VARCHAR));
        end loop;
    END;
$$; 

--generate dummy caretakers
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

--generate pet types
CREATE OR REPLACE FUNCTION list_of_pet_types() 
    RETURNS varchar[] AS $$
        BEGIN
            return array['dog', 'cat', 'hamster', 'bird', 'big bird', 'small bird', 'tiger', 'lion', 'elephant'];
        END;
    $$
LANGUAGE plpgsql;

--generate pet types and their prices
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


--generate pets of users
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

--generate caretaker able to care for pets
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

--some test entries to bids
INSERT INTO CARETAKERAVAILABILITY(username, date) VALUES ('401', '2020-08-09');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('6','4','400','2020-08-09', '2020-09-20');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('1','5','401','2020-08-09', '2020-08-09');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('2','5','401','2020-08-09', '2020-08-09');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('3','5','401','2020-08-09', '2020-08-09');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('4','5','401','2020-08-09', '2020-08-09');
UPDATE Bids SET status = 'ACCEPTED' WHERE owner_username = '1';