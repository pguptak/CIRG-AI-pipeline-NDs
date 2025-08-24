# model_files/config.py

class TransformerConfig:
    def __init__(self):
        self.hidden_size = 768
        self.transformer = {
            "mlp_dim": 3072,
            "num_heads": 12,
            "num_layers": 12,
            "attention_dropout_rate": 0.1,
            "dropout_rate": 0.1
        }
        self.patches = {
            "size": [16, 16]
        }
        self.classifier = "token"
        self.resnet = type('', (), {})()  # Empty object
        self.resnet.num_layers = ()
        self.resnet.width_factor = 1

def get_b16_config():
    config = TransformerConfig()
    config.patches["size"] = [16, 16]
    return config

def get_b32_config():
    config = TransformerConfig()
    config.patches["size"] = [32, 32]
    return config

def get_l16_config():
    config = get_b16_config()
    config.hidden_size = 1024
    config.transformer["mlp_dim"] = 4096
    config.transformer["num_heads"] = 16
    config.transformer["num_layers"] = 24
    return config

def get_l32_config():
    config = get_l16_config()
    config.patches["size"] = [32, 32]
    return config

def get_h14_config():
    config = TransformerConfig()
    config.hidden_size = 1280
    config.transformer["mlp_dim"] = 5120
    config.transformer["num_heads"] = 16
    config.transformer["num_layers"] = 32
    config.patches["size"] = [14, 14]
    return config

def get_r50_b16_config():
    config = get_b16_config()
    config.patches = {
        "grid": (14, 14)
    }
    config.resnet.num_layers = (3, 4, 9)
    config.resnet.width_factor = 1
    return config

def get_testing():
    return get_b16_config()
