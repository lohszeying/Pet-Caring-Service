--generate dummy users
DO $$
    BEGIN
        for r in 1..1000 loop
        --password is '1'.
            insert into Users (username, name, password) values(r, 'John', '$2b$10$gbBSQv0Zl2BouA8kehfu/.ErlOvFitj.BPs0gbPoT3gE3gXicx0CW');
        end loop;
    END;
$$;

--insert admin
DO $$
    BEGIN
        -- password is '123'
        insert into pcsadmin (username, password) values('admin', '$2b$10$7zODNHnlLLf7S.26UQB2m.o3cnCpuG6s7Z3qevCPO3vTYkt1/bgEK');
    END;
$$;

--generate dummy caretakers
DO $$
    DECLARE count INTEGER;   
    BEGIN
        count := 400;
        WHILE count<= 600 LOOP
            INSERT INTO CareTaker (username, is_fulltime) VALUES(count, mod(count,100) =0);
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
            INSERT INTO PetTypes (pet_type, base_price) VALUES(var, prices[ind]);
        END LOOP;
    END;
$$;

-- special requirements function
CREATE OR REPLACE FUNCTION list_of_special_requirements() 
    RETURNS varchar[] AS $$
        BEGIN
            --add more you can think of
            return array['must walk', 'must bathe', 'must eat', 'extra care'];
        END;
    $$
LANGUAGE plpgsql;

--generate special requirement
do $$
    declare reqs varchar[];
    declare var varchar;
    BEGIN
        reqs := list_of_special_requirements();
        FOREACH var in ARRAY reqs LOOP
            INSERT INTO SpecialRequirements (special_requirement) VALUES(var);
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
            WHILE pet <=10 LOOP
                INSERT INTO Pet (owner_username, pet_name, pet_type) 
                    VALUES(count, pet,  (list_of_pet_types())[mod(pet, array_length(list_of_pet_types(),1))+1] );
                INSERT INTO PetSpecialRequirements (owner_username, pet_name, special_requirement)
                    VALUES(count, pet, (list_of_special_requirements())[mod(pet, array_length(list_of_special_requirements(), 1) ) + 1]);
                INSERT INTO PetSpecialRequirements (owner_username, pet_name, special_requirement)
                    VALUES(count, pet, (list_of_special_requirements())[mod(pet + 3, array_length(list_of_special_requirements(), 1) ) + 1]);
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
        WHILE count < 500 LOOP
            INSERT INTO CareTakerPricing(username, pet_type, price) 
                VALUES (count, (list_of_pet_types())[mod(count, array_length(list_of_pet_types(),1))+1], count/23);
            count := count +1;
        END LOOP;
    END;
$$;

--some test entries to bids
DELETE FROM CARETAKERAVAILABILITY WHERE username = '400' AND date = '2020-09-09';
INSERT INTO CARETAKERAVAILABILITY(username, date) VALUES ('401', '2020-08-09');
INSERT INTO CARETAKERAVAILABILITY(username, date) VALUES ('401', '2020-08-08');
INSERT INTO CARETAKERAVAILABILITY(username, date) VALUES ('401', '2020-08-02');
INSERT INTO CARETAKERAVAILABILITY(username, date) VALUES ('401', '2020-08-01');
INSERT INTO CARETAKERAVAILABILITY(username, date) VALUES ('401', '2020-07-31');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('6','4','400','2020-08-09', '2020-08-30');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('1','4','400','2020-08-09', '2020-08-30');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('2','4','400','2020-08-09', '2020-08-30');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('3','4','400','2020-08-09', '2020-08-30');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('1','5','401','2020-08-09', '2020-08-09');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('2','5','401','2020-08-09', '2020-08-09');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('3','5','401','2020-08-09', '2020-08-09');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('4','5','401','2020-08-08', '2020-08-08');
INSERT INTO Bids(owner_username, pet_name, caretaker_username, start_date, end_date) VALUES ('4','5','401','2020-07-31', '2020-08-01');
DELETE FROM CARETAKERAVAILABILITY WHERE username = '401' AND date = '2020-08-09';
Update CareTaker SET is_fulltime = TRUE WHERE username = '407';
--suppose to return constrain error
UPDATE Bids SET status = 'ACCEPTED' WHERE owner_username = '1';
UPDATE Bids SET (status, rating) = ('COMPLETED',5) WHERE owner_username = '6';

SELECT * FROM BIDS;
SELECT GET_SALARY('400', 2020, 08);
SELECT * FROM ALLAVAILABLE('2020-08-01' ,'2020-08-02', '10', '4') LIMIT 10;
