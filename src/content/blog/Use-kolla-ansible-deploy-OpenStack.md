---
title: 使用 kolla-ansible 部署 OpenStack
pubDatetime: 2018-08-01T10:46:54+08:00
description: "在本地部署 OpenStack"
categories: Solutions
tags:
  - Cloud
  - OpenStack
  - Ops
keywords:
  - kolla-ansible
  - openstack
---

使用`kolla-ansible`部署"all-in-one" OpenStack Queens

<!-- toc -->
<!-- Description to show on index here  -->

# 准备

此教程在MacOS上完成，在开始前请预留8Gb内存，30G的磁盘空间，因为要下载相关资源文件，最好搭好梯子。

## 安装环境

- [VirtualBox](https://www.virtualbox.org/wiki/Downloads)
- [Vagrant](https://www.vagrantup.com/)

MacOS上强烈推荐使用[Homebrew](https://brew.sh/index_zh-cn), 然后使用命令`brew tap caskroom/cask`安装cask，安装完毕之后，安装上述两个Application只需要使用`brew cask install virtualbox vagrant`即可快速完成解压、安装等一系列人手操作。

<!-- more -->

# 下载Vagrantfile并启动

```bash
cd
mkdir -p workspace/learning/openstack
cd workspace/learning/openstack
curl -sS https://gist.github.com/Stark-X/d1e7ce4b8fcd2ea775249978237939f1
time vagrant up
```

Vagrantfile使用了CentOS 7 作为VM的image，还包含了一些初始化操作，如安装docker，花费时间视主机性能、网络而定。
<small>\* _作为参考，笔者使用的15版MBP(2.2Ghz i7 cpu, 16Gb mem, macOS High Sierra v10.13.6)，已有CentOS镜像缓存的情况下，用了10分钟。_</small>

# 配置

## globals.yml

位置：/etc/kolla/globals.yml
这个文件是kolla-ansible部署的关键配置文件，网络、组件开启关闭等所有的配置都由此文件决定。
以下几个配置只是其中一部分，OpenStack还有更多的参数可以改变，具体查看官方文档。

```yaml
# Valid options are ['centos', 'debian', 'oraclelinux', 'rhel', 'ubuntu']
kolla_base_distro: "centos"
# Valid options are [ binary, source ]
kolla_install_type: "source"
# Valid option is Docker repository tag
openstack_release: "queens"
enable_haproxy: no
network_interface: eth0
network_external_interface: eth1
kolla_internal_vip_address: 10.0.2.15
```

# 部署

## 部署前检查

```bash
# 开启调试模式的输出回显，便于查看日志
# ref: https://github.com/ansible/ansible/issues/27078
export ANSIBLE_STDOUT_CALLBACK=debug
sudo kolla-ansible prechecks -i all-in-one
```

这个步骤会检查配置文件设置是否可用，实际上是底层调用了ansible-playbook执行了一系列的操作。

### 可能会遇到的问题：

#### Error: Hostname has to resolve to IP address of api_interface

检查/etc/hosts文件里面的主机名是否为127.0.0.1，更新"kolla_internal_vip_address"在globals.yml文件里的值。

#### TASK [haproxy : Checking if kolla_internal_vip_address and kolla_external_vip_address are not pingable from any node] failed

因为部署为"all_in_one"，不需要"HA Proxy"，编辑globals.yml，去掉"enable_haproxy"的注释，并把值改为"no"

## 部署

```bash
sudo kolla-ansible deploy -i all-in-one
```

部署时间与网络状况挂钩，globals.yml中`enable_*`为yes的组件越多，时间越长，另外，第一次部署会拉取需要的Docker镜像，可自行架设私有镜像仓库，更改docker配置使用私有镜像仓库，加快部署速度。

## 生成命令行控制文件

```bash
sudo kolla-ansible post-deploy -i all-in-one
# 加载环境信息
. /etc/kolla/admin-openrc.sh
```

执行完毕后，/etc/kolla/admin-openrc.sh 会被生成，使用`cat`命令可以查看到其中的环境信息，这些信息会被openstack client用于操作OpenStack。

# Have fun

## 初始化demo环境

```bash
# 创建虚拟网络，创建flavor，上传模板等
bash /usr/share/kolla-ansible/init-runonce
```

执行完毕后，提示用以下命令创建一个demo实例。

```bash
openstack server create \\
    --image *** \\
    --flavor m1.tiny \\
    --key-name mykey \\
    --nic net-id=*** \\
    demo1
```

创建完毕后，执行`openstack console url show demo1`查看在线控制台的URL，可通过noVNC连接到实例的shell。
<small>\*_在virtualbox设置nat端口映射_</small>
或者在虚拟机内执行命令`sudo ip netns exec [NAME] ssh cirros@<ip>`切换network namespace，ssh到目标实例。
另外，类似`docker logs <container_name>`，我们可执行命令`openstack console log show demo1`查看实例的日志。

## 登录Admin

### 获取密码

```bash
grep keystone_admin_password /etc/kolla/passwords.yml
```

### 登录Admin

Url: http://localhost:8080/auth/login/
User: admin
Password: \*\*\*
<small>\*_在virtualbox设置nat端口映射_</small>

# 其它

## 修正错误的配置

若发现配置错误，需要重新部署，可选择使用以下工具清理环境。

```bash
bash /usr/share/kolla-ansible/tools/stop-containers
bash /usr/share/kolla-ansible/tools/cleanup-containers
bash /usr/share/kolla-ansible/tools/cleanup-host
bash /usr/share/kolla-ansible/tools/cleanup-images
# Or
sudo  kolla-ansible destroy -i all-in-one --yes-i-really-really-mean-it && kolla-ansible deploy -i all-in-one
```

## 设定的IP无法访问

原本宿主机、虚拟机之间可通过192.168.56.101通讯，部署完成后，无法继续通讯了，这是因为Neutron接管了网络，放置到了不同的namespace，可通过`ip netns`看到两个新的network namespace，使用命令`ip netns exec [NAME] ping <ip>`验证。

## OpenStack Client相关命令

以下列出部分OpenStack client的命令，可使用`openstack [command] help`查看相关的帮助信息。

- openstack flavor list
- openstack server list
- openstack server show [SERVER_NAME]
- ...

# Reference

- [使用Kolla-Ansible在CentOS 7单节点上部署OpenStack Pike] https://blog.csdn.net/yan7895566/article/details/79645774
- [利用kolla快速搭建openstack-ocata单节点] https://www.lijiawang.org/posts/kolla-openstack-ocata.html
- [CentOS7单节点部署OpenStack-Pike(使用kolla-ansible)] https://blog.csdn.net/persistvonyao/article/details/80229602#5deploy%E6%97%B6%E6%8A%A5%E9%94%99-please-enable-at-least-one-backend-when-enabling-cinder
- [使用kolla快速部署openstack all-in-one环境] https://www.sunmite.com/openstack/use-kolla-deploy-openstack-all-in-one.html
- [kolla-ansible Quick Start] https://docs.openstack.org/kolla-ansible/latest/user/quickstart.html
