FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Install dependencies directly (no requirements.txt needed)
RUN pip install --no-cache-dir \
    fastapi==0.110.1 \
    uvicorn==0.25.0 \
    motor==3.3.1 \
    pymongo==4.5.0 \
    python-dotenv==1.2.1 \
    python-multipart==0.0.22 \
    pydantic==2.12.5 \
    fpdf2==2.8.5 \
    openpyxl==3.1.5 \
    python-jose==3.5.0 \
    passlib==1.7.4 \
    bcrypt==4.1.3 \
    httpx==0.28.1 \
    openai==1.99.9 \
    emergentintegrations

COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
