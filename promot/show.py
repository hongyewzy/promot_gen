import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
path = r'D:\桌面\promot\prompt-generator\src\app\api\prompt\route.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
lines = content.split('\n')
for i, line in enumerate(lines, 1):
    print(f'{i}: {line}')