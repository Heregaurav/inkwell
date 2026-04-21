#!/usr/bin/env bash
set -euo pipefail

# Usage:
# ./deploy/eks-deploy.sh <aws-region> <aws-account-id> <cluster-name>
#
# Example:
# ./deploy/eks-deploy.sh us-east-1 123456789012 jerney-eks

REGION="${1:-}"
ACCOUNT_ID="${2:-}"
CLUSTER_NAME="${3:-}"

if [[ -z "$REGION" || -z "$ACCOUNT_ID" || -z "$CLUSTER_NAME" ]]; then
  echo "Usage: $0 <aws-region> <aws-account-id> <cluster-name>"
  exit 1
fi

BACKEND_REPO="inkwell-backend"
FRONTEND_REPO="inkwell-frontend"
BACKEND_IMAGE="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${BACKEND_REPO}:latest"
FRONTEND_IMAGE="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${FRONTEND_REPO}:latest"

echo "[1/7] Ensuring ECR repositories exist..."
aws ecr describe-repositories --repository-names "$BACKEND_REPO" --region "$REGION" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "$BACKEND_REPO" --region "$REGION" >/dev/null
aws ecr describe-repositories --repository-names "$FRONTEND_REPO" --region "$REGION" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "$FRONTEND_REPO" --region "$REGION" >/dev/null

echo "[2/7] Logging in to ECR..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "[3/7] Building backend image..."
docker build -t "$BACKEND_IMAGE" ./backend

echo "[4/7] Building frontend image..."
docker build -t "$FRONTEND_IMAGE" ./frontend

echo "[5/7] Pushing images..."
docker push "$BACKEND_IMAGE"
docker push "$FRONTEND_IMAGE"

echo "[6/7] Configuring kubectl for EKS cluster..."
aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER_NAME"

echo "[7/7] Deploying Kubernetes manifests..."
kubectl apply -f k8s/namespace.yaml

if ! kubectl -n inkwell get secret inkwell-secrets >/dev/null 2>&1; then
  echo "Secret inkwell-secrets does not exist."
  echo "Create it first from k8s/secret.example.yaml:"
  echo "  kubectl apply -f k8s/secret.example.yaml"
  echo "Then replace placeholder values:"
  echo "  kubectl edit secret inkwell-secrets -n inkwell"
  exit 1
fi

sed -e "s#<aws_account_id>#${ACCOUNT_ID}#g" -e "s#<region>#${REGION}#g" k8s/backend.deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/backend.service.yaml
sed -e "s#<aws_account_id>#${ACCOUNT_ID}#g" -e "s#<region>#${REGION}#g" k8s/frontend.deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/frontend.service.yaml

echo "Deployment submitted. Check status:"
echo "  kubectl -n inkwell get pods,svc"
