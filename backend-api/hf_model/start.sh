#!/bin/bash
mkdir -p temp_inputs temp_outputs
exec uvicorn main:app --host 0.0.0.0 --port 8000
