from picamera import PiCamera
from pathlib import Path
import time
import os

root_dir = "./../pictures/all_images/"
Path(root_dir).mkdir(parents=True, exist_ok=True)

filelist = [ f for f in os.listdir(root_dir) ]
for f in filelist:
    os.remove(os.path.join(root_dir, f))

num = int(input("Number of images to take"))

if __name__ == "__main__":
    camera = PiCamera()
    camera.vflip = True
    camera.exposure_mode = 'night'
    print("Taking a " + str(num) + " pictures to time how long it takes")
    start = time.time()
    c = 0

    for filename in camera.capture_continuous('{counter:03d}.jpg'):
        c += 1
        time.sleep(1)

    end = time.time()
    print(num, " pictures: ", end - start)