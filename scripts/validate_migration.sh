#!/bin/sh

firstLine=$(head -n 1 "$1")
lastLine=$(tail -n 1 "$1")

echo "Checking your migration file is wrapped in a transaction..."

if [ "$firstLine" != "BEGIN;" ]
then  
  echo "Missing BEGIN; in ${1}"
  echo "Migration files must be wrapped in a transaction"
  exit 1;
fi

if [ "$lastLine" != "COMMIT;" ]
then
  echo "Missing COMMIT; in ${1}"
  echo "Migration files must be wrapped in a transaction"
  exit 1;
fi