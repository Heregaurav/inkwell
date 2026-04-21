variable "aws_region" {
  description = "AWS region to deploy the EKS cluster"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "jerney-eks"
}

variable "cluster_version" {
  description = "Kubernetes version for EKS"
  type        = string
  default     = "1.32"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "backend_ecr_repo_name" {
  description = "ECR repository name for backend image"
  type        = string
  default     = "inkwell-backend"
}

variable "frontend_ecr_repo_name" {
  description = "ECR repository name for frontend image"
  type        = string
  default     = "inkwell-frontend"
}
