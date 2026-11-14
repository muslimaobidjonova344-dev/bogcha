"""Oddiy statik tekshiruv: import qilinmagan/aniqlanmagan nomlarni topadi (pyflakes yo'q muhit uchun)."""
import ast, builtins, sys, pathlib

def check(path):
    tree = ast.parse(path.read_text(encoding="utf-8"))
    defined = set(dir(builtins))
    star = False
    for n in ast.walk(tree):
        if isinstance(n, (ast.Import, ast.ImportFrom)):
            for a in n.names:
                if a.name == "*": star = True
                defined.add((a.asname or a.name).split(".")[0])
        elif isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            defined.add(n.name)
            if not isinstance(n, ast.ClassDef):
                a = n.args
                for x in a.args + a.kwonlyargs + a.posonlyargs: defined.add(x.arg)
                if a.vararg: defined.add(a.vararg.arg)
                if a.kwarg: defined.add(a.kwarg.arg)
        elif isinstance(n, ast.Lambda):
            for x in n.args.args: defined.add(x.arg)
        elif isinstance(n, ast.Name) and isinstance(n.ctx, (ast.Store, ast.Del)):
            defined.add(n.id)
        elif isinstance(n, ast.ExceptHandler) and n.name: defined.add(n.name)
        elif isinstance(n, ast.arg): defined.add(n.arg)
    bad = []
    for n in ast.walk(tree):
        if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load) and n.id not in defined:
            bad.append((n.lineno, n.id))
    return star, bad

rc = 0
for p in pathlib.Path(sys.argv[1]).rglob("*.py"):
    star, bad = check(p)
    for ln, name in bad:
        if star and name[0].isupper(): continue
        print(f"{p}:{ln}: aniqlanmagan nom '{name}'"); rc = 1
sys.exit(rc)
