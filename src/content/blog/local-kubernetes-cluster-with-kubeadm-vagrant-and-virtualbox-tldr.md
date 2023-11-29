---
title: 使用Kubeadm, Vagrant, Virtualbox部署本地Kubernetes集群 - TL;DR
pubDatetime: 2019-03-04T23:25:14+08:00
description: "使用Kubeadm, Vagrant, Virtualbox部署本地Kubernetes集群 - 太长不看版本"
categories: Solutions
tags:
  - Kubernetes
  - Vagrant
  - Ops
keywords:
  - kubernetes
  - k8s
  - vagrant
  - network
header_image: http://img-cdn-bb2.xjztest.com/file/stark-x-blog/20190305160831-Kubernetes_dashboard-access.png
timeliness: true
---

<!-- toc -->
<!-- Description to show on index here  -->

本文章是上一篇文章「<a href="/posts/使用kubeadm-vagrant-virtualbox部署本地kubernetes集群">使用Kubeadm, Vagrant, Virtualbox部署本地Kubernetes集群</a> 」的 TL;DR 版本。

# 目标

- 启动两个虚拟机，一个作为主节点，一个作为工作节点
- 熟悉 Kubeadm
- 在集群上部署Kubernetes-dashboard、nginx

<!-- more -->

# 环境相关

- 操作系统：macOS Mojave 10.14.3 (18D109)
- 编排工具：Vagrant 2.2.3
- 虚拟机：Virtualbox 6.0
- 可变参数：注意所有替换文中所有的${xxx}为自己环境的值

# 实验环境设计

使用 Vagrant 配合 Virtualbox 建立两个节点模拟集群，一个作为 master node，一个作为 work node。

## 要求

- master:
  - network:
    - 8001:8001/tcp
    - 80:10000/tcp
- worker:
  - network:
    - 80:10001/tcp
- master & worker:
  - OS: Ubuntu/xenial64
  - CPU: 2 core
  - MEM: 2 GB
  - network:
    - iface x 2: NAT & Host-Only
  - dependencies:
    - kubelet
    - kubectl
    - kubeadm
    - docker

## Vagrantfile

```ruby Vagrantfile
$script = <<-SCRIPT
echo "Update and install the kubeadm"

apt-get update && apt-get install -y apt-transport-https curl
curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
cat <<EOF >/etc/apt/sources.list.d/kubernetes.list
deb https://apt.kubernetes.io/ kubernetes-xenial main
EOF
apt-get update
apt-get install -y kubelet kubeadm kubectl docker.io
apt-mark hold kubelet kubeadm kubectl
usermod -aG docker vagrant
kubeadm config images pull
SCRIPT

Vagrant.configure("2") do |config|
  config.vm.provider "virtualbox" do |v|
    v.memory = 2048
    v.cpus = 2
  end

  config.vm.define "master", primary: true do |master|
    master.vm.hostname = "k8s-cluster-master"
    master.vm.box = "ubuntu/xenial64"
    master.vm.network "forwarded_port", guest: 80, host: 10000, protocol: "tcp"
    master.vm.network "forwarded_port", guest: 8001, host: 8001, protocol: "tcp"
    master.vm.network "private_network", type: "dhcp"
    master.vm.provision "shell", inline: $script
  end

  config.vm.define "node" do |node|
    node.vm.hostname = "k8s-cluster-node"
    node.vm.box = "ubuntu/xenial64"
    node.vm.network "forwarded_port", guest: 80, host: 10001, protocol: "tcp"
    node.vm.network "private_network", type: "dhcp"
    node.vm.provision "shell", inline: $script
  end
end
```

## 启动节点

执行命令`vagrant up`，Vagrant 开始自动下载Ubuntu镜像，顺利启动后，vagrant 会执行我们写在`Vagrantfile`里的 Shell 脚本。初始化完成后，在当前窗口执行`vagrant ssh master`，新开一个窗口执行`vagrant ssh node`分别 ssh 进入到主节点以及工作节点。
![vagrant up](http://img-cdn-bb2.xjztest.com/file/stark-x-blog/20190305142616-vagrant_up.png)_<small>第一次执行`vagrant up`会看到更多的信息。</small>_

使用命令`ip a`查看当前节点 ip，两个节点互相 ping，检查连通性。

# 部署 Kubernetes 集群

根据上述 Vagrantfile 创建出来的虚拟机各有两个网卡，第一个是 NAT 模式，第二个是 Host-Only 模式，而 Kubernetes nodes 节点间通讯应该通过第二个网卡，所以选择了 _flannel_ 作为 [CNI 插件](https://kubernetes.io/docs/concepts/cluster-administration/addons/)，因为它可以指定用于节点间通讯的网卡 (iface)([原因](https://github.com/coreos/flannel/blob/master/Documentation/troubleshooting.md#vagrant))。

参考[官方文档](https://kubernetes.io/docs/setup/independent/create-cluster-kubeadm/)，步骤如下：

1. 获取 _flannel_ 的 yaml 文件，修改系统参数，并修改 iface 使用第二个网卡。

```bash
sudo sysctl net.bridge.bridge-nf-call-iptables=1
wget https://github.com/coreos/flannel/blob/master/Documentation/kube-flannel.yml
# 找到image tag是-amd64结尾的/opt/bin/flanneld，在下面的args列表添加 - --iface 以及 - enp0s8 这两行
# vim kube-flannel.md
```

2. 在主节点 _k8s-cluster-master_ 执行`sudo kubeadm init --apiserver-advertise-address=${ip} --pod-network-cidr=10.244.0.0/16`初始化节点，成功后，根据 kubeadm 的输出，执行接下来的命令。
3. 复制 kubeadm 生成的配置文件，更改配置文件夹的权限

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

4. 启动 CNI 插件 _flannel_

```bash
kubectl apply -f kube-flannel.yml
```

5. 把下面 shell 脚本保存为 "change-kubelet-node-ip.sh"，并执行

```bash change-kubelet-node-ip.sh
#!/bin/sh
COND_NODE_IP=`grep node-ip /var/lib/kubelet/kubeadm-flags.env | wc -l`
if [[ ${COND_NODE_IP} = 1 ]]; then
  echo "--node-ip had been set, skipped"
  exit 0
fi
sudo sed -i '/^.*/ s/$/ --node-ip=${ip}/' /var/lib/kubelet/kubeadm-flags.env
sudo systemctl restart kubelet
```

6. 在 worker节点执行如下脚本，把 worker 节点加入到 Kubernetes 集群

```bash
kubeadm join ${master_ip}:6443 --token ${token} --discovery-token-ca-cert-hash sha256:${hash} --apiserver-advertise-address=${worker_ip}
```

7. 在 worker 节点同样运行上述的 "change-kubelet-node-ip.sh"，注意修改脚本里的 ip地址为 worker 节点的 ip。
8. 查看节点状态，Pods 状态

![Node: master | get pods, get nodes](http://img-cdn-bb2.xjztest.com/file/stark-x-blog/20190305154528-get_pods_nodes-master.png)<center><small>Node: master | get pods, get nodes</small></center>

![Node: worker | kubeadm join](http://img-cdn-bb2.xjztest.com/file/stark-x-blog/20190305154700-kubeadm_join-worker.png)<center><small>Node: worker | kubeadm join</small></center>

# 部署 Kubernetes Dashboard

1. 从[Kubernetes Dashboard Repo](https://github.com/kubernetes/dashboard)获取部署命令，部署 dashboard。
2. 查看 pods 状态，直到相关 pods 处于 running 状态。
3. 启动 Kubenetes Proxy。
4. 通过 proxy 访问 Dashboard: http://localhost:8001/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/ 。(Kubernetes Proxy 是一个反向代理，把外部请求通过主节点/集群，转发到工作节点/集群，避免直接暴露服务，降低安全风险)

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v1.10.1/src/deploy/recommended/kubernetes-dashboard.yaml
kubectl get pods -n kube-system
kubectl proxy --address 0.0.0.0
```

![Node: master | Kubernetes dashboard](http://img-cdn-bb2.xjztest.com/file/stark-x-blog/20190305160256-kubernetes_dashboard-master.png)<center><small>Node: master | Kubernetes dashboard</small></center>

![Kubernetes Dashboard Login](http://img-cdn-bb2.xjztest.com/file/stark-x-blog/20190305160831-Kubernetes_dashboard-access.png) <center><small>Kubernetes Dashboard Login</small></center>

# 部署 Nginx

编写一个 yaml 文件，部署两个 NGINX instance 到集群。

## nginx-rs.yaml

保存下面的yaml，命名为 "nginx-rs.yaml"。

```yaml nginx-rs.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  selector:
    svc: nginx
  type: ClusterIP
  ports:
    - port: 9999
      targetPort: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 2
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      svc: nginx
  template:
    metadata:
      name: nginx
      labels:
        svc: nginx
    spec:
      containers:
        - name: nginx
          image: nginx
          ports:
            - containerPort: 80
              protocol: TCP
```

## 部署

```bash
# vi nginx-rs.yaml
kubectl apply -f nginx-rs.yaml
kubectl get pods
kubectl proxy --address 0.0.0.0
```

在宿主机打开 http://localhost:8001/api/v1/namespaces/default/services/nginx/proxy/ 即可看到熟悉的 NGINX 默认首页。([Kubernetes proxy URL 规则](https://kubernetes.io/zh/docs/tasks/access-application-cluster/access-cluster/#%E6%89%8B%E5%8A%A8%E6%9E%84%E5%BB%BA-apiserver-%E4%BB%A3%E7%90%86-url))

![Nginx via Kubernetes proxy](http://img-cdn-bb2.xjztest.com/file/stark-x-blog/20190305162916-kubernetes_nginx.png) <center><small>Nginx via Kubernetes proxy</small></center>

# 完

此篇文章省略了在实验期间踩过的大量的坑，如果跟着我的流程下来遇到了什么问题可以先查看上一篇文章「{% post_link Local-kubernetes-cluster-with-kubeadm-vagrant-and-virtualbox %}」，可能你会找到答案，或者在下方留言评论。
