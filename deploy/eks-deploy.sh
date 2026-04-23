#!/usr/bin/env bash
set -euo pipefail

# Usage:
# ./deploy/eks-deploy.sh <aws-region> <aws-account-id> <cluster-name> [ingress-hostname]
#
# Example:
# ./deploy/eks-deploy.sh us-east-1 123456789012 jerney-eks
# ./deploy/eks-deploy.sh us-east-1 123456789012 jerney-eks app.example.com

REGION="${1:-}"
ACCOUNT_ID="${2:-}"
CLUSTER_NAME="${3:-}"
INGRESS_HOST="${4:-}"

if [[ -z "$REGION" || -z "$ACCOUNT_ID" || -z "$CLUSTER_NAME" ]]; then
  echo "Usage: $0 <aws-region> <aws-account-id> <cluster-name> [ingress-hostname]"
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
kubectl apply -f k8s/ingressclass-alb.yaml

if [[ -n "$INGRESS_HOST" ]]; then
  sed -e "/- http:/i\\    - host: ${INGRESS_HOST}" k8s/ingress.yaml | kubectl apply -f -
else
  kubectl apply -f k8s/ingress.yaml
fi

echo "Deployment submitted. Check status:"
echo "  kubectl -n inkwell get pods,svc"
echo
echo "Waiting for ingress hostname..."
for i in {1..30}; do
  INGRESS_HOST="$(kubectl -n inkwell get ingress inkwell-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)"
  if [[ -n "${INGRESS_HOST}" ]]; then
    break
  fi
  sleep 5
done

if [[ -n "${INGRESS_HOST:-}" ]]; then
  echo "Public endpoint (ALB): http://${INGRESS_HOST}"
else
  echo "Ingress hostname is not ready yet. Check with:"
  echo "  kubectl -n inkwell get ingress inkwell-ingress -o wide"
fi

echo
echo "If you still want local-only access:"
echo "  kubectl -n inkwell port-forward svc/inkwell-frontend 8080:80"
