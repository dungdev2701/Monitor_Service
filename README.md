# Monitor Service

Service xử lý các tác vụ tự động: giám sát tools status.

## Kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitor Service                          │
│               (Node.js - chạy liên tục 24/7)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Dead Checker Job (mỗi 60 giây)                            │
│   ┌───────────────────────────────────────────────────┐     │
│   │ 1. Gọi API: POST /api/public/monitor/mark-stale-dead   │
│   │ 2. API tìm tools có updatedAt > 5 phút                 │
│   │ 3. Cập nhật status = DIE                               │
│   └───────────────────────────────────────────────────┘     │
│                                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP API call
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Manager Site API (port 3005)                   │
│              + PostgreSQL (tools table)                     │
└─────────────────────────────────────────────────────────────┘
```

## Tính năng

### Dead Checker Job
- Chạy mỗi 60 giây (có thể cấu hình)
- Gọi API Manager Site để kiểm tra tools
- Tools có `updatedAt` > 5 phút và status = RUNNING → cập nhật thành DIE

## Cấu trúc thư mục

```
monitor-service/
├── src/
│   ├── config.ts        # Cấu hình môi trường
│   ├── logger.ts        # Logger utility
│   ├── api-client.ts    # HTTP client gọi Manager API
│   ├── jobs/
│   │   └── dead-checker.ts  # Dead checker job
│   └── index.ts         # Entry point
├── Dockerfile
├── docker-compose.yml
├── package.json
└── .env.example
```

## Cài đặt

### Development

```bash
cd monitor-service

# Cài đặt dependencies
npm install

# Tạo file .env
cp .env.example .env

# Cấu hình trong .env:
# MANAGER_API_URL=http://localhost:3005
# MONITOR_API_KEY=your-api-key

# Chạy
npm run dev
```

### Production với Docker

```bash
# Build và chạy
docker-compose up -d

# Xem logs
docker-compose logs -f monitor-service
```

## Biến môi trường

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `MANAGER_API_URL` | URL Manager Site API | http://localhost:3005 |
| `MONITOR_API_KEY` | API key cho Monitor Service | - |
| `DEAD_CHECKER_INTERVAL_MS` | Interval check (ms) | 60000 (60s) |
| `DEAD_CHECKER_STALE_MINUTES` | Phút không update → DIE | 5 |
| `LOG_LEVEL` | Log level (debug/info/warn/error) | info |

## Cấu hình Manager Site API

Thêm `API_KEY_MONITOR` vào file `.env` của Manager Site API:

```env
API_KEY_MONITOR=your-secure-monitor-api-key
```

## Flow hoạt động

```
1. Monitor Service khởi động
2. Kiểm tra kết nối với Manager API (health check)
3. Bắt đầu Dead Checker Job

Dead Checker Job (mỗi 60s):
├── Gọi POST /api/public/monitor/mark-stale-dead?staleMinutes=5
├── Manager API tìm tools:
│   - status = RUNNING
│   - updatedAt < (now - 5 minutes)
├── Cập nhật status = DIE
└── Trả về danh sách tools đã đánh dấu
```

## Logs

```
[2024-01-15T10:00:00.000Z] [INFO] Starting Monitor Service...
[2024-01-15T10:00:00.100Z] [INFO] Connected to Manager Site API
[2024-01-15T10:00:00.200Z] [INFO] Starting Dead Checker Job
[2024-01-15T10:00:01.000Z] [INFO] Marked 2 stale tools as DIE { tools: ['Normal 1', 'Captcha 1'] }
```
