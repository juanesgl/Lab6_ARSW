CREATE TABLE IF NOT EXISTS blueprints (
    author VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (author, name)
);

CREATE TABLE IF NOT EXISTS points (
    id SERIAL PRIMARY KEY,
    blueprint_author VARCHAR(100) NOT NULL,
    blueprint_name VARCHAR(100) NOT NULL,
    x INT NOT NULL,
    y INT NOT NULL,
    point_order INT NOT NULL,
    FOREIGN KEY (blueprint_author, blueprint_name) REFERENCES blueprints(author, name) ON DELETE CASCADE
);