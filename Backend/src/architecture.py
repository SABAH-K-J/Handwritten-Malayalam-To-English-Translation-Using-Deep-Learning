# src/architecture.py
import torch.nn as nn

class ResNetBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1, downsample=None):
        super(ResNetBlock, self).__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        self.downsample = downsample

    def forward(self, x):
        identity = x
        if self.downsample is not None: identity = self.downsample(x)
        out = self.conv1(x)
        out = self.bn1(out)
        out = self.relu(out)
        out = self.conv2(out)
        out = self.bn2(out)
        out += identity
        out = self.relu(out)
        return out

class CustomCRNN(nn.Module):
    def __init__(self, num_classes):
        super(CustomCRNN, self).__init__()
        self.in_channels = 64
        self.conv1 = nn.Conv2d(1, 64, kernel_size=3, stride=1, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(64)
        self.relu = nn.ReLU(inplace=True)
        self.maxpool = nn.MaxPool2d(kernel_size=2, stride=2)

        # --- KEY DIFFERENCE: WIDE ARCHITECTURE ---
        # We only downsample width in Layer 2. Layers 3 & 4 keep width high.
        self.layer1 = self._make_layer(64, 2, stride=1)
        self.layer2 = self._make_layer(128, 2, stride=2)     # H/2, W/2
        self.layer3 = self._make_layer(256, 2, stride=(2,1)) # H/4, W/2
        self.layer4 = self._make_layer(512, 2, stride=(2,1)) # H/8, W/2

        self.last_conv = nn.Sequential(
            nn.Conv2d(512, 512, kernel_size=2, stride=(2,1), padding=0),
            nn.BatchNorm2d(512),
            nn.ReLU()
        )
        
        # Updated RNN with Dropout (Matches your 93% Training)
        self.rnn = nn.Sequential(
            nn.LSTM(512, 256, bidirectional=True, batch_first=True, num_layers=2, dropout=0.5),
            nn.Linear(512, 256),
            nn.ELU(),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes)
        )

    def _make_layer(self, out_channels, blocks, stride=1):
        downsample = None
        if stride != 1 or self.in_channels != out_channels:
            downsample = nn.Sequential(
                nn.Conv2d(self.in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(out_channels),
            )
        layers = []
        layers.append(ResNetBlock(self.in_channels, out_channels, stride, downsample))
        self.in_channels = out_channels
        for _ in range(1, blocks):
            layers.append(ResNetBlock(out_channels, out_channels))
        return nn.Sequential(*layers)

    def forward(self, x):
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.last_conv(x)
        x = x.squeeze(2).permute(0, 2, 1) 
        x, _ = self.rnn[0](x)
        x = self.rnn[1](x)
        x = self.rnn[2](x)
        x = self.rnn[3](x)
        x = self.rnn[4](x)
        return x