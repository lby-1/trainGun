# ============================================================
# TRAINGÜN - 多阶段构建 Dockerfile
# 使用 nginx:alpine 作为轻量静态文件服务器
# ============================================================

FROM nginx:alpine

LABEL maintainer="lby-1"
LABEL description="TRAINGÜN - 开源网页 FPS 练枪训练器"
LABEL version="1.0"

# 移除 nginx 默认站点配置
RUN rm -rf /usr/share/nginx/html/*

# 复制自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制项目静态文件
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY docs/images/ /usr/share/nginx/html/docs/images/

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

# 启动 nginx（前台运行）
CMD ["nginx", "-g", "daemon off;"]
