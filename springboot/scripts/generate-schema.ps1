$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$schemaPath = Join-Path $projectRoot "database\\schema-mysql.sql"
if (Test-Path $schemaPath) {
	Remove-Item $schemaPath -Force
}

& ".\mvnw.cmd" -q -DskipTests "-Dspring-boot.run.arguments=--spring.profiles.active=schema-export" spring-boot:run

Write-Host "Generated database/schema-mysql.sql"
