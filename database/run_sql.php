<?php

declare(strict_types=1);

if ($argc < 2) {
    fwrite(STDERR, "Usage: php database/run_sql.php <sql-file>\n");
    exit(1);
}

$sqlFile = $argv[1];
if (!file_exists($sqlFile)) {
    fwrite(STDERR, "SQL file not found: {$sqlFile}\n");
    exit(1);
}

$dbConfig = require __DIR__ . '/../config/database.php';

$mysqli = new mysqli(
    $dbConfig['host'],
    $dbConfig['username'],
    $dbConfig['password'],
    $dbConfig['database'],
    (int) $dbConfig['port']
);

if ($mysqli->connect_errno) {
    fwrite(STDERR, 'Connection failed: ' . $mysqli->connect_error . PHP_EOL);
    exit(1);
}

$sql = file_get_contents($sqlFile);
if ($sql === false) {
    fwrite(STDERR, "Unable to read SQL file: {$sqlFile}\n");
    exit(1);
}

if (!$mysqli->multi_query($sql)) {
    fwrite(STDERR, 'Import failed: ' . $mysqli->error . PHP_EOL);
    exit(1);
}

do {
    if ($result = $mysqli->store_result()) {
        $result->free();
    }
} while ($mysqli->more_results() && $mysqli->next_result());

if ($mysqli->errno) {
    fwrite(STDERR, 'Import iteration failed: ' . $mysqli->error . PHP_EOL);
    exit(1);
}

echo "SQL import successful: {$sqlFile}\n";
