import cv2
from pathlib import Path
from image_recognition.classifier_net import Net
from skimage import io, transform
from torchvision import transforms, utils
import torch
from time import time
import atexit

cap = cv2.VideoCapture(0)

def exit_handler():
    cap.release()

atexit.register(exit_handler)

PATH = './class_net.pth'

root_dir = "./pictures/all_images/"
Path(root_dir).mkdir(parents=True, exist_ok=True)

if __name__ == "__main__":
    net = Net()
    net.load_state_dict(torch.load(PATH))
    t = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))])
    counter = 0
    while True:
        tstep = time()
        ret, frame = cap.read()
        frame = cv2.flip(frame, 0)
        frame = cv2.flip(frame, 1)
        cv2.imwrite(root_dir + str(counter) + '.png', frame)
        img = io.imread(root_dir + str(counter) + '.png')
        counter += 1
        img = transform.resize(img, (72, 128))
        img = t(img).float()
        print("Got picture in " + str(time() - tstep))
        tstep = time()
        output = net.forward(img.unsqueeze(0))
        print(output[0][0])
        print("Analysed picture in " + str(time() - tstep))
        tstep = time()