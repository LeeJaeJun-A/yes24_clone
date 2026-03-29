output "instance_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.app.public_ip
}

output "site_url" {
  description = "URL to access the YES24 clone"
  value       = "http://${aws_instance.app.public_ip}"
}

output "ssm_command" {
  description = "SSM Session Manager command to connect (no SSH needed)"
  value       = "aws ssm start-session --target ${aws_instance.app.id} --region ${var.region}"
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
