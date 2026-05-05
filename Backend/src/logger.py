"""Shared console logger used across the backend modules."""


class Log:
    """Tiny ANSI console logger with a consistent label and color scheme."""

    RESET = "\033[0m"
    BOLD = "\033[1m"
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"

    @staticmethod
    def process(msg):
        print(f"{Log.CYAN}{Log.BOLD}[PROCESS]{Log.RESET} {msg}")

    @staticmethod
    def info(msg):
        print(f"{Log.BLUE}[INFO]{Log.RESET}    {msg}")

    @staticmethod
    def success(msg):
        print(f"{Log.GREEN}{Log.BOLD}[SUCCESS]{Log.RESET} {msg}")

    @staticmethod
    def warn(msg):
        print(f"{Log.YELLOW}[WARN]{Log.RESET}    {msg}")

    @staticmethod
    def error(msg):
        print(f"{Log.RED}{Log.BOLD}[ERROR]{Log.RESET}   {msg}")