1st step: Configured Kubernetes Kubeadm cluster on AWS EC2 ubuntu instance


sudo nano /etc/hostname        # Edit system hostname
sudo apt update && sudo apt upgrade -y   # Update & upgrade packages
sudo apt-get update && sudo apt-get upgrade -y  # Update & upgrade packages
sudo swapoff -a                # Disable swap for kubeadm
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab  # Comment out swap in fstab

# Set sysctl params for Kubernetes networking
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-ipforward.conf
sudo sysctl --system
sysctl net.ipv4.ip_forward

sudo apt-get install -y apt-transport-https ca-certificates curl gpg   # Required packages

# Clean old cluster
sudo kubeadm reset -f
sudo systemctl stop kubelet
sudo systemctl stop containerd
sudo rm -rf /etc/cni/net.d
sudo iptables -F && sudo iptables -t nat -F && sudo iptables -t mangle -F && sudo iptables -X
sudo ipvsadm --clear || true

# Remove old kube packages
sudo apt-mark unhold kubeadm kubelet kubectl || true
sudo apt-get purge -y kubeadm kubelet kubectl
sudo apt-get autoremove -y

# Add repo for Kubernetes v1.29
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" | sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update

# Install kubeadm/kubelet/kubectl v1.29 and hold them
sudo apt-get install -y kubeadm=1.29.8-1.1 kubelet=1.29.8-1.1 kubectl=1.29.8-1.1
sudo apt-mark hold kubeadm kubelet kubectl

# Restart services
sudo systemctl daemon-reexec
sudo systemctl restart containerd
sudo systemctl restart kubelet

# Initialize new cluster
sudo kubeadm init --pod-network-cidr=10.244.0.0/16 --kubernetes-version=v1.29.8
kubectl get no

# Configure Calico networking
kubectl -n kube-system edit configmap calico-config
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/calico.yaml
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Enable br_netfilter module for Calico networking
sudo modprobe br_netfilter
echo "br_netfilter" | sudo tee /etc/modules-load.d/br_netfilter.conf
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward = 1
EOF
sudo sysctl --system

# Apply Calico with custom pod CIDR
curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/calico.yaml
sed -i 's/192.168.0.0\/16/10.244.0.0\/16/g' calico.yaml
kubectl apply -f calico.yaml

# Verify cluster & pods
kubectl get no
kubectl get po -A
kubectl get nodes -o wide
kubectl get pods -n kube-system -o wide
kubectl get pods -n kube-system | grep calico
kubectl cluster-info

# Check API server garbage collector logs
kubectl -n kube-system logs kube-apiserver-$(hostname) | grep gc
sudo nano /etc/kubernetes/manifests/kube-apiserver.yaml

# Check Kubernetes version
kubectl version

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm ls
