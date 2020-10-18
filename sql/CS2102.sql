CREATE TABLE PCSAdmin
(
    username VARCHAR(64) PRIMARY KEY,
    password VARCHAR NOT NULL,
    enabled  BOOLEAN DEFAULT TRUE
);

CREATE TABLE Users
(
    username VARCHAR(64) PRIMARY KEY,
    name     VARCHAR(64) NOT NULL,
    area     VARCHAR(64) NULL,
    password VARCHAR     NOT NULL,
    enabled  BOOLEAN DEFAULT TRUE
);

CREATE TABLE PetOwner
(
    username VARCHAR(64) PRIMARY KEY,
    FOREIGN KEY (username) REFERENCES Users (username)
);

CREATE TABLE CareTaker
(
    username    VARCHAR(64) PRIMARY KEY,
    is_fulltime BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (username) REFERENCES Users (username)
);

CREATE TABLE PetTypes
(
    name VARCHAR(64) PRIMARY KEY
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
    pet_type       VARCHAR(64),
    PRIMARY KEY (owner_username, name),
    FOREIGN KEY (owner_username) REFERENCES PetOwner (username) ON DELETE CASCADE,
    FOREIGN KEY (pet_type) REFERENCES PetTypes (name) ON DELETE CASCADE
);

CREATE TABLE PetSpecialRequirements
(
    owner_username       VARCHAR(64),
    name                 VARCHAR(64),
    special_requirements VARCHAR,
    PRIMARY KEY (owner_username, name, special_requirements),
    FOREIGN KEY (owner_username, name) REFERENCES Pet (owner_username, name) ON DELETE CASCADE,
    FOREIGN KEY (special_requirements) REFERENCES SpecialRequirements (description) ON DELETE CASCADE
);

CREATE TABLE CareTakerPricing
(
    username VARCHAR(64),
    pet_type VARCHAR(64),
    price    DECIMAL(8, 2),
    PRIMARY KEY (username, pet_type),
    FOREIGN KEY (username) REFERENCES CareTaker (username),
    FOREIGN KEY (pet_type) REFERENCES PetTypes (name)
);

CREATE TABLE CareTakerAvailability
(
    username VARCHAR(64),
    date     DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (username, date),
    FOREIGN KEY (username) REFERENCES CareTaker (username)
);

CREATE TYPE transfer_methods AS ENUM ('OWNER_DELIVER', 'CARETAKER_PICKUP', 'PCS_BUILDING');
CREATE TYPE payment_types AS ENUM ('CREDIT_CARD', 'CASH');

CREATE TABLE Bids
(
    successful      BOOLEAN          DEFAULT FALSE,
    rating          SMALLINT         DEFAULT NULL CHECK (rating >= 0 AND rating <= 5),
    review          VARCHAR          DEFAULT NULL,
    price           DECIMAL(8, 2),
    transfer_method transfer_methods DEFAULT NULL,
    payment_type    payment_types    DEFAULT NULL,
    owner_username  VARCHAR(64),
    pet_name        VARCHAR(64),
    cta_username    VARCHAR(64),
    cta_date        DATE NOT NULL    DEFAULT CURRENT_DATE,
    PRIMARY KEY (owner_username, pet_name, cta_username, cta_date),
    FOREIGN KEY (owner_username, pet_name) REFERENCES Pet (owner_username, name),
    FOREIGN KEY (cta_username, cta_date) REFERENCES CareTakerAvailability (username, date)
);