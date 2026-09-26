import http.client
try:
    c = http.client.HTTPConnection('127.0.0.1', 4001, timeout=5)
    c.request('GET', '/api/departments', headers={'Connection': 'close'})
    r = c.getresponse()
    print("STATUS:", r.status)
    print("BODY:", r.read()[:100])
    c.close()
except Exception as e:
    print("ERROR:", e)
