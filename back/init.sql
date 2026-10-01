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
-- Datos de ejemplo para la demo de tiempo real (Lab P4). Solo se insertan si no existen.
INSERT INTO blueprints (author, name) VALUES
    ('juan', 'plano-1'),
    ('juan', 'casa-de-campo')
ON CONFLICT DO NOTHING;

INSERT INTO points (blueprint_author, blueprint_name, x, y, point_order)
SELECT v.author, v.name, v.x, v.y, v.point_order
FROM (VALUES
    ('juan', 'plano-1', 60, 60, 0),
    ('juan', 'plano-1', 200, 120, 1),
    ('juan', 'casa-de-campo', 60, 240, 0),
    ('juan', 'casa-de-campo', 60, 100, 1),
    ('juan', 'casa-de-campo', 160, 40, 2),
    ('juan', 'casa-de-campo', 260, 100, 3),
    ('juan', 'casa-de-campo', 260, 240, 4)
) AS v(author, name, x, y, point_order)
WHERE NOT EXISTS (
    SELECT 1 FROM points p WHERE p.blueprint_author = v.author AND p.blueprint_name = v.name
);
