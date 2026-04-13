pipeline {
    agent any

    environment {
        DOCKER_CREDS = credentials('dockerhub-credentials')
        DOCKER_USER = 'malikvti'
        KANIKO_NAMESPACE = 'ticketing-app'
        KANIKO_EXECUTOR_IMAGE = 'gcr.io/kaniko-project/executor:v1.23.2'
    }

    stages {
        stage('Tooling Setup') {
            steps {
                script {
                    sh '''
                        if ! command -v kubectl &> /dev/null; then
                            echo "kubectl not found. Downloading..."
                            curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
                            chmod +x kubectl
                            sudo mv kubectl /usr/local/bin/ || {
                                mkdir -p $WORKSPACE/bin
                                mv kubectl $WORKSPACE/bin/
                            }
                        fi
                    '''
                }
            }
        }

        stage('Build & Push Images (Kaniko on Kubernetes)') {
            steps {
                script {
                    def rawUrl = env.GIT_REPO_URL ?: env.GIT_URL
                    if (!rawUrl?.trim()) {
                        error('GIT_URL (SCM) or GIT_REPO_URL must be set so Kaniko can clone the repo in-cluster.')
                    }
                    if (!env.GIT_COMMIT?.trim()) {
                        error('GIT_COMMIT is empty. Use a full SCM checkout (not lightweight) for this pipeline.')
                    }

                    def repoUrl = rawUrl.trim()
                    if (repoUrl.startsWith('git@')) {
                        def at = repoUrl.indexOf('@')
                        def colon = repoUrl.indexOf(':')
                        if (colon > at) {
                            def host = repoUrl.substring(at + 1, colon)
                            def path = repoUrl.substring(colon + 1)
                            repoUrl = "git://${host}/${path}"
                        }
                    } else if (repoUrl.startsWith('https://')) {
                        repoUrl = 'git://' + repoUrl.substring('https://'.length())
                    }
                    if (!repoUrl.endsWith('.git')) {
                        repoUrl += '.git'
                    }
                    def kanikoContext = "${repoUrl}#${env.GIT_COMMIT}"

                    def services = [
                        [name: 'frontend', dockerfile: 'frontend/Dockerfile'],
                        [name: 'api-gateway', dockerfile: 'api-gateaway/Dockerfile'],
                        [name: 'authentication-service', dockerfile: 'backend/authentication-service/Dockerfile'],
                        [name: 'booking-service', dockerfile: 'backend/booking-service/Dockerfile'],
                        [name: 'payment-service', dockerfile: 'backend/payment-service/Dockerfile'],
                        [name: 'flight-service', dockerfile: 'backend/catalog-service/flight-service/Dockerfile'],
                        [name: 'hotel-service', dockerfile: 'backend/catalog-service/hotel-service/Dockerfile'],
                        [name: 'train-service', dockerfile: 'backend/catalog-service/train-service/Dockerfile'],
                        [name: 'profile-service', dockerfile: 'backend/profile-service/Dockerfile'],
                        [name: 'pricing-service', dockerfile: 'backend/pricing-service/Dockerfile'],
                        [name: 'notification-service', dockerfile: 'backend/notification-service/Dockerfile'],
                        [name: 'admin-service', dockerfile: 'backend/admin-service/Dockerfile']
                    ]

                    withCredentials([file(credentialsId: 'k8s-kubeconfig', variable: 'KUBECONFIG_PATH')]) {
                        sh """
                            export KUBECONFIG="\${KUBECONFIG_PATH}"
                            export PATH="\${WORKSPACE}/bin:\${PATH}"

                            kubectl get ns "${env.KANIKO_NAMESPACE}" >/dev/null 2>&1 || kubectl create ns "${env.KANIKO_NAMESPACE}"

                            kubectl create secret docker-registry kaniko-docker-registry \\
                                --docker-server=https://index.docker.io/v1/ \\
                                --docker-username="\${DOCKER_CREDS_USR}" \\
                                --docker-password="\${DOCKER_CREDS_PSW}" \\
                                --namespace="${env.KANIKO_NAMESPACE}" \\
                                --dry-run=client -o yaml | kubectl apply -f -
                        """

                        for (def svc : services) {
                            def jobName = "kaniko-${svc.name}-${env.BUILD_NUMBER}".replaceAll('_', '-')
                            def dest = "docker.io/${env.DOCKER_USER}/${svc.name}:latest"
                            writeFile file: 'kaniko-job.yaml', text: """apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: ${env.KANIKO_NAMESPACE}
spec:
  backoffLimit: 1
  activeDeadlineSeconds: 7200
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: kaniko
          image: ${env.KANIKO_EXECUTOR_IMAGE}
          args:
            - "--dockerfile=${svc.dockerfile}"
            - "--context=${kanikoContext}"
            - "--destination=${dest}"
            - "--verbosity=info"
          env:
            - name: DOCKER_CONFIG
              value: /kaniko/.docker
          envFrom:
            - secretRef:
                name: kaniko-git-credentials
                optional: true
          resources:
            requests:
              memory: 1Gi
              cpu: 500m
            limits:
              memory: 6Gi
              cpu: "2"
          volumeMounts:
            - name: docker-config
              mountPath: /kaniko/.docker
      volumes:
        - name: docker-config
          secret:
            secretName: kaniko-docker-registry
            items:
              - key: .dockerconfigjson
                path: config.json
"""
                            sh """
                                export KUBECONFIG="\${KUBECONFIG_PATH}"
                                export PATH="\${WORKSPACE}/bin:\${PATH}"
                                kubectl apply -f kaniko-job.yaml
                                set +e
                                kubectl wait --for=condition=complete job/${jobName} -n ${env.KANIKO_NAMESPACE} --timeout=45m
                                WAIT_RC=\$?
                                set -e
                                if [ "\$WAIT_RC" -ne 0 ]; then
                                  echo "=== kubectl describe job/${jobName} ==="
                                  kubectl describe job/${jobName} -n ${env.KANIKO_NAMESPACE} 2>/dev/null || true
                                  echo "=== pods (job-name=${jobName}) ==="
                                  kubectl get pods -n ${env.KANIKO_NAMESPACE} -l job-name=${jobName} -o wide 2>/dev/null || true
                                  echo "=== kaniko container logs (by pod) ==="
                                  for POD in \$(kubectl get pods -n ${env.KANIKO_NAMESPACE} -l job-name=${jobName} -o jsonpath='{.items[*].metadata.name}' 2>/dev/null); do
                                    echo "--- Pod: \$POD ---"
                                    kubectl logs -n ${env.KANIKO_NAMESPACE} "\$POD" -c kaniko --tail=500 2>/dev/null \\
                                      || kubectl logs -n ${env.KANIKO_NAMESPACE} "\$POD" --all-containers --tail=500 2>/dev/null \\
                                      || true
                                  done
                                  kubectl delete job ${jobName} -n ${env.KANIKO_NAMESPACE} --ignore-not-found || true
                                  exit 1
                                fi
                                kubectl delete job ${jobName} -n ${env.KANIKO_NAMESPACE} --ignore-not-found
                            """
                        }
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    withCredentials([file(credentialsId: 'k8s-kubeconfig', variable: 'KUBECONFIG_PATH')]) {
                        sh '''
                            export KUBECONFIG=$KUBECONFIG_PATH
                            export PATH=$WORKSPACE/bin:$PATH

                            echo "Applying manifests from the 'deployments' directory..."
                            kubectl apply -f deployments/

                            echo "Deployment Complete! Checking Pod status:"
                            kubectl get pods -n ticketing-app
                        '''
                    }
                }
            }
        }
    }
}
