# 简化 Dockerfile - 仅用于运行
FROM alpine:latest

# 安装必要的包
RUN apk --no-cache add ca-certificates tzdata

# 设置时区
ENV TZ=Asia/Shanghai

# 创建用户和目录
RUN adduser -D -g '' cloudclip && \
    mkdir -p /app/uploads && \
    chown -R cloudclip:cloudclip /app

# 设置工作目录
WORKDIR /app

# 复制本地构建的文件
COPY cloud-clip .
COPY config.json .

# 设置权限
RUN chmod +x cloud-clip && \
    chown cloudclip:cloudclip cloud-clip config.json

# 暴露端口
EXPOSE 8080

# 切换到非 root 用户
USER cloudclip

# 启动命令
CMD ["./cloud-clip"]