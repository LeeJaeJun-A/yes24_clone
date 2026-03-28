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
  description = "EC2 key pair name (leave empty to create new)"
  type        = string
  default     = ""
}

variable "allowed_cidr" {
  description = "CIDR blocks allowed to access the site (default: open to all)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}
