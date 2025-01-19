import serial
import socketio
import threading
import time

# Initialize serial connection
ser = serial.Serial('COM7', 115200)

# Initialize SocketIO client
sio = socketio.Client()

# Check if the serial connection is open
if ser.is_open:
    print(f'Successfully connected to {ser.port} at {ser.baudrate} baudrate')
else:
    print(f'Failed to connect to {ser.port}')

# Variable to store the latest size data
latest_size_data = '50'  # Default value

@sio.event
def connect():
    print('Connected to WebSocket server')

@sio.event
def disconnect():
    print('Disconnected from WebSocket server')

@sio.on('sizeData')
def on_size_data(data):
    global latest_size_data
    print(f'Received size data: {data}')
    latest_size_data = data  # Update the latest size data
    print(f'Updated latest_size_data to: {latest_size_data}')
    # Send data via serial
    ser.write(f'{data}\n'.encode())
    print(f'Sent data to {ser.port}: {data}')

# Connect to the WebSocket server
sio.connect('http://localhost:5000')

# Function to continuously send data
def continuous_send():
    while True:
        # Send the latest size data
        ser.write(f'{latest_size_data}\n'.encode())
        print(f'Continuously sent data to {ser.port}: {latest_size_data}')
        time.sleep(0.1)  # Adjust the sleep time for sending frequency

# Start the continuous sending in a separate thread
threading.Thread(target=continuous_send, daemon=True).start()

# Keep the script running
sio.wait() 