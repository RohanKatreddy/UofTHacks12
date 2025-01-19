import pyaudio
import numpy as np

# Initialize PyAudio
p = pyaudio.PyAudio()

# List available audio devices
print("Available audio devices:")
for i in range(p.get_device_count()):
    dev = p.get_device_info_by_index(i)
    print(f"{i}: {dev['name']}")

# Get and print the name of the input device being used
input_device_info = p.get_device_info_by_index(1)  # Change this index if needed
print(f"Using input device: {input_device_info['name']}")

# Open stream with a specific device index
stream = p.open(format=pyaudio.paInt16,
                channels=1,
                rate=44100,
                input=True,
                input_device_index=1,  # Change this index to the desired device
                frames_per_buffer=1024)

print("Opening stream...")

def compute_volume_and_beat(data):
    # Convert data to numpy array
    audio_data = np.frombuffer(data, dtype=np.int16)
    
    # Compute volume (RMS)
    volume = np.sqrt(np.mean(audio_data**2))
    
    # Placeholder for beat detection logic
    beat = False  # Implement beat detection logic here
    
    return volume, beat

try:
    while True:
        # Read data from stream
        data = stream.read(1024)
        print("Data read from stream.")
        
        # Compute volume and beat
        volume, beat = compute_volume_and_beat(data)
        
        # Print data (or send to JavaScript)
        print(f"Volume: {volume}, Beat: {beat}")

except KeyboardInterrupt:
    pass

finally:
    print("Stopping stream...")
    # Stop and close the stream
    stream.stop_stream()
    stream.close()
    p.terminate() 