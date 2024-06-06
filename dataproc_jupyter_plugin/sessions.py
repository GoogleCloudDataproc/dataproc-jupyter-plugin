# client.py
import aiohttp

# Global aiohttp client session
client_session = None

async def get_client_session():
    global client_session
    if client_session is None:
        client_session = aiohttp.ClientSession()
    return client_session


