# 我ai学习 · 备份格式文档

> 版本：2026-08-07（v2.2）
> 所有数据字段与 `S` 状态一一对应；备份文件可在「我的 → 数据管理」导入恢复。

## 一、明文备份（JSON）

下载文件名：`我ai学习备份-YYYY-MM-DD.json`

顶层结构：

```json
{
  "_type": "kaoyan-workbench-v2",
  "_v": 2,
  "startDay": "2026-08-02",
  "done": { "1": { "full": 1, "makeup": 0 } },
  "kpDone": { "pol": { "p1": 1 } },
  "score": 30,
  "records": [],
  "redeemed": [],
  "curSub": "all",
  "attempts": {},
  "wrong": [],
  "easyDay": null,
  "periodUsed": 0,
  "periodMonth": "2026-08",
  "periodToday": null,
  "notes": {},
  "reviewed": {},
  "studyDays": 90,
  "lastStudy": {},
  "lastReview": {},
  "revStep": {},
  "mastery": {},
  "qStats": {},
  "prepDate": "",
  "prepTriggered": "",
  "prepShown": ""
}
```

### 字段说明（22 个状态字段 + 版本标识）

| 字段 | 类型 | 含义 |
|---|---|---|
| `startDay` | string | 计划第 1 天（缺失默认 `2026-08-02`） |
| `done` | object | `{ 天数: {full, makeup} }` 每日打卡记录 |
| `kpDone` | object | `{ 科目: { 知识点id: 1 } }` 已掌握知识点 |
| `score` | number | 累计积分 |
| `records` | array | 积分流水（最多 300 条，新在前） |
| `redeemed` | array | 已兑换奖励 |
| `curSub` | string | 题库筛选科目 |
| `attempts` | object | 闯关已用机会 |
| `wrong` | array | 错题本（`{sub,kid,qi,date}`） |
| `easyDay` / `periodToday` | string/null | 当日轻松一下 / 月假标记 |
| `periodUsed` / `periodMonth` | number/string | 月假本月配额 |
| `notes` | object | 每日备注 |
| `reviewed` | object | 当日已复习标记 |
| `studyDays` | number | 计划天数（30–365） |
| `lastStudy` | object | 最近学习日 |
| `lastReview` | object | **上次复习成功日**（自适应排期基线） |
| `revStep` | object | 复习步（0..5） |
| `mastery` | object | 掌握度缓存 |
| `qStats` | object | 答题统计 `{ ok, total }`（驱动自适应间隔） |
| `prepDate` / `prepTriggered` / `prepShown` | string | 引导弹窗状态 |

## 二、加密备份（.istudy）

下载文件名：`我ai学习加密备份-YYYY-MM-DD.istudy`

算法：口令 → PBKDF2-SHA256（150,000 次迭代，随机 16 字节盐）→ AES-256-GCM（随机 12 字节 IV）加密明文字段 JSON。

```json
{
  "_type": "istudy-backup-encrypted",
  "_v": 1,
  "kdf": "PBKDF2-SHA256",
  "cipher": "AES-GCM",
  "iter": 150000,
  "salt": "<base64>",
  "iv": "<base64>",
  "data": "<base64 密文>"
}
```

解密的明文即 §一 的 JSON 结构。**口令只在本地浏览器派生，不上传任何服务器；忘记口令无法找回。**

## 三、兼容与迁移

- 导入时校验 `_type`/`_v`；旧版 v2 备份缺少 `lastReview/qStats` 等新字段时由 `sanitizeImport` 自动补默认值，向后兼容。
- 导入前应用自动把当前数据备份到 localStorage `wb_kaoyan2_preImportBackup`，覆盖后仍可恢复。
- 加密备份必须用「导入恢复」同一入口选择；应用会自动识别 `.istudy` 并走解密流程。

## 四、数据存储位置

| 存储 | 键/库 | 作用 |
|---|---|---|
| localStorage | `wb_kaoyan2_*` | 主存储（同步读写） |
| IndexedDB | `istudy-store` / `state` | 大容量镜像，清缓存后自动恢复 |
