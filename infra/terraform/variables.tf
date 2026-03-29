variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "project" {
  description = "Project name prefix"
  type        = string
  default     = "yes24-clone"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.large"
}

variable "key_name" {
  description = "EC2 key pair name (optional — SSH is disabled, SSM is used instead)"
  type        = string
  default     = ""
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "minio_user" {
  description = "MinIO root user"
  type        = string
  default     = "yes24minio"
}

variable "minio_password" {
  description = "MinIO root password"
  type        = string
  sensitive   = true
}


