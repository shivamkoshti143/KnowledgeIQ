import urllib.request
try:
    req = urllib.request.Request("http://127.0.0.1:4001/api/departments")
    with urllib.request.urlopen(req, timeout=5) as res:
        print("STATUS:", res.status)
        print("BODY:", res.read()[:100])
except Exception as e:
    print("ERROR:", e)
