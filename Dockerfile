# 多阶段构建 Dockerfile for 云剪贴板
FROM golang:1.23-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装 git（用于获取依赖）
RUN apk add --no-cache git

# 复制 go.mod 和 go.sum
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

# 确保静态文件目录存在
RUN mkdir -p ./lib/static

# 构建应用，包含嵌入的静态文件
RUN CGO_ENABLED=0 GOOS=linux go build -tags embed -a -installsuffix cgo -o cloud-clip main.go

# 第二阶段：运行环境
FROM alpine:latest

# 安装 ca-certificates（用于 HTTPS）
RUN apk --no-cache add ca-certificates tzdata

# 设置时区
ENV TZ=Asia/Shanghai

# 创建用户和组
RUN adduser -D -g '' cloudclip

# 创建必要的目录
RUN mkdir -p /app/uploads && \
    chown -R cloudclip:cloudclip /app

# 设置工作目录
WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /app/cloud-clip .

# 更改文件所有者
RUN chown cloudclip:cloudclip cloud-clip

# 暴露端口
EXPOSE 8080

# 切换到非 root 用户
USER cloudclip

# 启动命令
CMD ["./cloud-clip"]