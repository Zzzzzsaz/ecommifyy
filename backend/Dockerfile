FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Install dependencies directly
RUN pip install --no-cache-dir \
    fastapi==0.110.1 \
    uvicorn==0.25.0 \
    motor==3.3.1 \
    pymongo==4.5.0 \
    python-dotenv==1.0.1 \
    python-multipart==0.0.9 \
    pydantic==2.6.0 \
    fpdf2==2.7.8 \
    openpyxl==3.1.2 \
    python-jose==3.3.0 \
    passlib==1.7.4 \
    bcrypt==4.1.2 \
    httpx==0.27.0 \
    openai==1.12.0

COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
