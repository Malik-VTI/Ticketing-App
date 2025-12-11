# Required Dependencies

The following dependencies need to be added to `go.mod`. Run `go get` for each or use `go mod tidy` after creating all files.

## Required Packages

```bash
# JWT handling
go get github.com/golang-jwt/jwt/v5

# UUID generation
go get github.com/google/uuid

# SQL Server driver
go get github.com/denisenkom/go-mssqldb

# Environment variable loading (.env file support)
go get github.com/joho/godotenv

# Password hashing (already included via golang.org/x/crypto)
# No additional install needed
```

## Quick Install

Run this command to install all dependencies:

```bash
go get github.com/golang-jwt/jwt/v5 github.com/google/uuid github.com/denisenkom/go-mssqldb github.com/joho/godotenv
go mod tidy
```

## Or use go mod tidy

After all files are created, simply run:

```bash
go mod tidy
```

This will automatically download all required dependencies based on the imports in your code.
