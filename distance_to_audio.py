import serial
import pygame
import numpy as np
import time

# Initialize Pygame Mixer for sound output
pygame.mixer.init(frequency=44100, size=-16, channels=1, buffer=512)

# Open Serial port (replace with your correct port)
ser = serial.Serial('/dev/tty.usbmodemF412FA705D502', 9600)

def generate_tone(frequency, volume=1.0):
    sample_rate = 44100
    duration = 1  # 1 second duration, will loop this sound
    n_samples = int(sample_rate * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    waveform = 32767 * np.sin(2 * np.pi * frequency * t) * volume
    waveform = waveform.astype(np.int16)
    return pygame.sndarray.make_sound(waveform)

current_sound = None
current_frequency = None
new_frequency = None
previous_distance = None
volume = 0.5  # Start with 50% volume

try:
    while True:  # Read data continuously
        line = ser.readline().decode('utf-8').strip()
        if "Frequency:" in line:
            parts = line.split(',')
            distance_str = parts[0].split(':')[-1].strip()
            distance_str = distance_str.replace('mm', '').strip()  # Remove 'mm'
            distance = int(distance_str)
            frequency_str = parts[1].split(':')[-1].strip()
            new_frequency = int(frequency_str)
            
            if previous_distance is not None:
                rate_of_change = abs(distance - previous_distance)
                if rate_of_change > 2:  # Rapid change detected
                    volume = 0.5 + min(0.5, (rate_of_change - 2) / 20.0)  # Scale volume up to 1.0 times
                else:
                    volume = max(0.5, volume - 0.05)  # Gradually decrease volume back to 0.5
            
            previous_distance = distance
            
            if new_frequency != current_frequency:
                print(f"New frequency: {new_frequency} Hz, Volume: {volume}")
                if current_sound:
                    current_sound.stop()
                current_sound = generate_tone(new_frequency, volume)
                current_sound.play(loops=-1)
                current_frequency = new_frequency
            else:
                # Adjust volume immediately
                current_sound.set_volume(volume)
except KeyboardInterrupt:
    print("Program stopped by user")
    if current_sound is not None:
        current_sound.stop()
    ser.close()
    pygame.quit()



    # 音の変化する時にはどうすればいいか　ーー *渐强渐弱
    # MaxMLB change of frequency -- stop for a sec problem
    #　さおん combination tone