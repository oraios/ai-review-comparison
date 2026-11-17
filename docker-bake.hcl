# gh-aw v1.2.2 uses Agent Workflow Firewall v0.29.11.
variable "PROJECT_IMAGE" {
  default = "ghcr.io/oraios/ai-review-comparison/review-env@sha256:c0188b2abb6d59c31609d42c4c5b4f62d6e8f1f1011889e509e68485fe1c028d"
}

target "firewall" {
  context = "https://github.com/github/gh-aw-firewall.git#d9272015d8523b4c9cf3b00ce26b507046cbf1a3:containers/agent"
  platforms = ["linux/amd64"]
  args = { BASE_IMAGE = PROJECT_IMAGE }
}

target "gh-aw" {
  context = "."
  dockerfile = "Dockerfile.gh-aw"
  contexts = {
    firewall = "target:firewall"
    project = "docker-image://${PROJECT_IMAGE}"
  }
  platforms = ["linux/amd64"]
  tags = ["review-awf:local"]
}
