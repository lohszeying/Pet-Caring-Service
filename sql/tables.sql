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



CREATE TABLE CareTaker
(
    username    VARCHAR(64) PRIMARY KEY,
    is_fulltime BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (username) REFERENCES Users (username) ON UPDATE CASCADE
);

CREATE TABLE PetTypes
(
    pet_type VARCHAR(64) PRIMARY KEY,
    base_price NUMERIC(10,2) NOT NULL
);


CREATE TABLE SpecialRequirements
(
    special_requirement VARCHAR PRIMARY KEY
);

CREATE TABLE Pet
(
    owner_username VARCHAR(64),
    pet_name           VARCHAR(64),
    enabled        BOOLEAN DEFAULT TRUE,
    pet_type       VARCHAR(64) NOT NULL,
    PRIMARY KEY (owner_username, pet_name),
    FOREIGN KEY (owner_username) REFERENCES PetOwner (username) ON UPDATE CASCADE,
    FOREIGN KEY (pet_type) REFERENCES PetTypes (pet_type) ON UPDATE CASCADE
);

CREATE TABLE PetSpecialRequirements
(
    owner_username       VARCHAR(64),
    pet_name                 VARCHAR(64),
    special_requirement VARCHAR,
    PRIMARY KEY (owner_username, pet_name, special_requirement), 
    FOREIGN KEY (owner_username, pet_name) REFERENCES Pet (owner_username, pet_name) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (special_requirement) REFERENCES SpecialRequirements (special_requirement) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE CareTakerPricing
(
    username VARCHAR(64),
    pet_type VARCHAR(64),
    price    DECIMAL(8, 2),
    PRIMARY KEY (username, pet_type),
    FOREIGN KEY (username) REFERENCES CareTaker (username) ON UPDATE CASCADE,
    FOREIGN KEY (pet_type) REFERENCES PetTypes (pet_type) ON UPDATE CASCADE
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



--boolean function to check if a certain caretaker can care for a certain pet
CREATE OR REPLACE FUNCTION ABLETOCAREFOR(pname VARCHAR, owner_name VARCHAR, caretaker_username VARCHAR) 
    RETURNS BOOLEAN AS 
    $$ BEGIN
        RETURN EXISTS (
            SELECT 1 
            FROM pet P, CareTakerPricing C
            WHERE pname = P.pet_name AND owner_name = P.owner_username AND P.pet_type = C.pet_type AND caretaker_username = C.username
            );
    END;
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ONLEAVE(cname VARCHAR, start_date date, end_date date)
    RETURNS BOOLEAN AS 
    $$ BEGIN 
        RETURN EXISTS (SELECT 1 
                            FROM generate_series(start_date, end_date, interval '1 day') AS t(day)
                            WHERE NOT EXISTS (SELECT 1
                                                FROM CareTakerAvailability
                                                WHERE username = cname and date = t.day)
                        );
        END;
        $$ LANGUAGE plpgsql;


CREATE TYPE bidstatus AS ENUM ('ACCEPTED', 'PENDING', 'REJECTED', 'COMPLETED');

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
    FOREIGN KEY (owner_username, pet_name) REFERENCES Pet (owner_username, pet_name) ON UPDATE CASCADE,
    FOREIGN KEY (caretaker_username) REFERENCES CareTaker (username) ON UPDATE CASCADE,
    CONSTRAINT LEGALTIMEPERIOD CHECK (start_date <= end_date),
    CONSTRAINT ABLETOCAREFOR CHECK (status = 'REJECTED' OR ABLETOCAREFOR(pet_name, owner_username, caretaker_username)),
    CONSTRAINT NOFALSERATINGS CHECK (status = 'COMPLETED' OR (rating IS NULL AND review IS NULL)),
    CONSTRAINT NOTONLEAVE CHECK (status = 'REJECTED' OR NOT ONLEAVE(caretaker_username, start_date, end_date))
);



