pipeline {
    agent any
    
    environment {
        // You need to configure these credentials in Jenkins GUI
        // DOCKER_CREDS is a 'Username with password' credential
        DOCKER_CREDS = credentials('dockerhub-credentials') 
        // KUBECONFIG_CRED is a 'Secret file' credential containing your ~/.kube/config
        KUBECONFIG_CRED = credentials('k8s-kubeconfig') 
        DOCKER_USER = 'malikvti'
    }

    stages {
        stage('Tooling Setup') {
            steps {
                script {
                    // Check if kubectl exists, download securely if not
                    sh '''
                        if ! command -v kubectl &> /dev/null; then
                            echo "kubectl not found. Downloading..."
                            curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
                            chmod +x kubectl
                            
                            # Attempt to move to /usr/local/bin, if no sudo rights move it to workspace and extend PATH
                            sudo mv kubectl /usr/local/bin/ || {
                                mkdir -p $WORKSPACE/bin
                                mv kubectl $WORKSPACE/bin/
                            }
                        fi
                    '''
                }
            }
        }

        stage('Build & Push Images') {
            steps {
                script {
                    // Login to Docker Hub
                    sh 'echo $DOCKER_CREDS_PSW | docker login -u $DOCKER_CREDS_USR --password-stdin'
                    
                    def services = [
                        [name: 'frontend', path: './frontend'],
                        [name: 'api-gateway', path: './api-gateaway'],
                        [name: 'authentication-service', path: './backend/authentication-service'],
                        [name: 'booking-service', path: './backend/booking-service'],
                        [name: 'payment-service', path: './backend/payment-service'],
                        [name: 'flight-service', path: './backend/catalog-service/flight-service'],
                        [name: 'hotel-service', path: './backend/catalog-service/hotel-service'],
                        [name: 'train-service', path: './backend/catalog-service/train-service'],
                        [name: 'profile-service', path: './backend/profile-service'],
                        [name: 'pricing-service', path: './backend/pricing-service'],
                        [name: 'notification-service', path: './backend/notification-service'],
                        [name: 'admin-service', path: './backend/admin-service']
                    ]
                    
                    for (int i = 0; i < services.size(); i++) {
                        def service = services[i]
                        echo "Building and Pushing ${service.name}..."
                        // Note: Because you mentioned containerd, if your Jenkins server DOES NOT have the `docker` 
                        // command-line tool installed, you can replace `docker build` and `docker push` with `nerdctl build` and `nerdctl push` below.
                        sh """
                            docker build -t ${DOCKER_USER}/${service.name}:latest ${service.path}
                            docker push ${DOCKER_USER}/${service.name}:latest
                        """
                    }
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                script {
                    // Use the custom downloaded kubectl or the system one with the secure kubeconfig
                    withCredentials([file(credentialsId: 'k8s-kubeconfig', variable: 'KUBECONFIG_PATH')]) {
                        sh '''
                            export KUBECONFIG=$KUBECONFIG_PATH
                            
                            # Ensure local kubectl binary is prioritized if it was downloaded here
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
