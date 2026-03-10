FROM python:3.11-slim

# Imposta variabili d'ambiente per Python
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Installa le dipendenze
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia il codice dell'applicazione
COPY . .

EXPOSE 8080

# Comando per avviare l'applicazione con Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--access-logfile", "-", "run:app"]