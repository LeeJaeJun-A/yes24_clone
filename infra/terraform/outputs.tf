output "instance_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.app.public_ip
}

output "site_url" {
  description = "URL to access the YES24 clone"
  value       = "http://${aws_instance.app.public_ip}"
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = var.key_name != "" ? "ssh -i <your-key>.pem ec2-user@${aws_instance.app.public_ip}" : "ssh -i infra/terraform/${var.project}-key.pem ec2-user@${aws_instance.app.public_ip}"
}

output "ecr_backend" {
  description = "ECR repository URL for backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend" {
  description = "ECR repository URL for frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app.id
}

output "ssh_key_file" {
  description = "Path to SSH private key (if auto-generated)"
  value       = var.key_name == "" ? "${path.module}/${var.project}-key.pem" : "N/A (using existing key: ${var.key_name})"
}
