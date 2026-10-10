```bash
# ВЗЯЛ ЗАДАЧУ №1
git checkout main
git pull origin main
git checkout -b feature/1-название-латиницей

# РАБОТАЕШЬ
git status
git add ТВОИ-ФАЙЛЫ
git commit -m "1: что сделал"
git push

# ПОДТЯНУТЬ СВЕЖИЙ MAIN
git pull origin main

# ПОСЛЕ МЕРЖА PR
git checkout main
git pull origin main
git branch -d feature/1-название-латиницей

# ГДЕ Я?
git branch --show-current
git status
git log --oneline -5
```