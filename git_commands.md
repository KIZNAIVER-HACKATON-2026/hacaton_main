```bash
# ВЗЯЛ ЗАДАЧУ №12
git checkout dev
git pull origin dev
git checkout -b feature/12-название-латиницей

# РАБОТАЕШЬ, сохраняешься раз в час
git status
git add ТВОИ-ФАЙЛЫ
git commit -m "12: что сделал"
git push

# ПОДТЯНУТЬ СВЕЖИЙ DEV К СЕБЕ
git pull origin dev

# СДАЛ ЗАДАЧУ (после мержа PR на сайте)
git checkout dev
git pull origin dev
git branch -d feature/12-название-латиницей

# ГДЕ Я? ЧТО ИЗМЕНИЛОСЬ?
git branch --show-current
git status
git log --oneline -5
```