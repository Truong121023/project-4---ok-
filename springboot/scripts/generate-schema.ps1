$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

& ".\mvnw.cmd" -q -DskipTests "-Dspring-boot.run.arguments=--spring.profiles.active=schema-export" spring-boot:run

Write-Host "Generated database/schema-mysql.sql"
