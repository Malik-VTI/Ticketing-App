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

        // DEVOPS-06: Run unit tests per stack BEFORE building images so a broken
        // build is caught early. This stage is best-effort: each stack is wrapped
        // in catchError so a missing toolchain on the Jenkins agent (or a not-yet
        // test-ready service) marks the stage UNSTABLE instead of failing the whole
        // pipeline. Flip `buildResult`/`stageResult` to 'FAILURE' once a stack's
        // tests are mandatory.
        stage('Test') {
            steps {
                script {
                    // Go services (modules with a real go.mod). Each dir is tested
                    // independently so one failing module does not skip the others.
                    def goServices = [
                        'backend/authentication-service',
                        'backend/booking-service',
                        'backend/catalog-service/hotel-service',
                        'backend/notification-service',
                        'backend/payment-service'
                    ]
                    // Java / Spring Boot services (Maven). Uses the wrapper (./mvnw)
                    // when present, otherwise falls back to a system `mvn`.
                    def javaServices = [
                        'backend/admin-service',
                        'backend/catalog-service/flight-service',
                        'backend/catalog-service/train-service',
                        'backend/pricing-service',
                        'backend/profile-service'
                    ]

                    catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE', message: 'Go tests failed or Go toolchain unavailable') {
                        if (sh(script: 'command -v go >/dev/null 2>&1', returnStatus: true) != 0) {
                            // Note: Go not installed on this agent; skip without failing.
                            echo 'Go toolchain not found on agent; skipping Go tests. Install Go or use a Go-capable agent to enable.'
                        } else {
                            for (def dir : goServices) {
                                echo "Running Go tests in ${dir}"
                                sh "cd '${dir}' && go test ./..."
                            }
                        }
                    }

                    catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE', message: 'Java/Maven tests failed or Maven unavailable') {
                        for (def dir : javaServices) {
                            echo "Running Maven tests in ${dir}"
                            // Prefer the project's Maven wrapper; fall back to system mvn.
                            // `|| true` is intentionally NOT used here so a real test
                            // failure surfaces — catchError keeps it non-fatal overall.
                            sh """
                                cd '${dir}'
                                if [ -x ./mvnw ]; then
                                    ./mvnw -q test
                                elif command -v mvn >/dev/null 2>&1; then
                                    mvn -q test
                                else
                                    echo 'No Maven wrapper or system mvn found; skipping ${dir}.'
                                fi
                            """
                        }
                    }

                    catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE', message: 'Node gateway tests failed or npm unavailable') {
                        if (sh(script: 'command -v npm >/dev/null 2>&1', returnStatus: true) != 0) {
                            echo 'npm not found on agent; skipping Node gateway tests.'
                        } else {
                            echo 'Running Node tests in api-gateway'
                            sh '''
                                cd api-gateway
                                npm ci || npm install
                                npm test
                            '''
                        }
                    }
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

                    // Important: each Dockerfile uses COPY relative to its service directory.
                    // We therefore build with a context sub-path per service.
                    def services = [
                        [name: 'frontend', path: 'frontend'],
                        [name: 'api-gateway', path: 'api-gateway'],
                        [name: 'authentication-service', path: 'backend/authentication-service'],
                        [name: 'booking-service', path: 'backend/booking-service'],
                        [name: 'payment-service', path: 'backend/payment-service'],
                        [name: 'flight-service', path: 'backend/catalog-service/flight-service'],
                        [name: 'hotel-service', path: 'backend/catalog-service/hotel-service'],
                        [name: 'train-service', path: 'backend/catalog-service/train-service'],
                        [name: 'profile-service', path: 'backend/profile-service'],
                        [name: 'pricing-service', path: 'backend/pricing-service'],
                        [name: 'notification-service', path: 'backend/notification-service'],
                        [name: 'admin-service', path: 'backend/admin-service']
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

                        def failed = []
                        for (def svc : services) {
                            def jobName = "kaniko-${svc.name}-${env.BUILD_NUMBER}".replaceAll('_', '-')
                            // DEVOPS-06: Push TWO immutable+rolling tags instead of only :latest.
                            //   - :${BUILD_NUMBER} gives every build a unique, traceable tag.
                            //   - :latest is kept so existing manifests that reference :latest
                            //     keep resolving (no broken references).
                            def imageRepo = "docker.io/${env.DOCKER_USER}/${svc.name}"
                            def destVersioned = "${imageRepo}:${env.BUILD_NUMBER}"
                            def destLatest = "${imageRepo}:latest"
                            writeFile file: 'kaniko-job.yaml', text: """apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: ${env.KANIKO_NAMESPACE}
spec:
  backoffLimit: 0
  activeDeadlineSeconds: 2700
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: kaniko
          image: ${env.KANIKO_EXECUTOR_IMAGE}
          args:
            - "--dockerfile=Dockerfile"
            - "--context=${kanikoContext}"
            - "--context-sub-path=${svc.path}"
            - "--destination=${destVersioned}"
            - "--destination=${destLatest}"
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
                            // Build one image, streaming kaniko logs LIVE so the full build
                            // output is always in the Jenkins console — even if Kubernetes
                            // garbage-collects the pod afterwards. (The old version waited 45m
                            // for a 'complete' condition that never comes on a failed job, then
                            // fetched logs from pods that were already gone.) returnStatus records
                            // a failing image without aborting the whole matrix, so one broken
                            // service (e.g. frontend) no longer hides the status of the rest.
                            def rc = sh(returnStatus: true, script: """
                                export KUBECONFIG="\${KUBECONFIG_PATH}"
                                export PATH="\${WORKSPACE}/bin:\${PATH}"
                                NS="${env.KANIKO_NAMESPACE}"
                                JOB="${jobName}"

                                kubectl apply -f kaniko-job.yaml

                                # From here we manage exit codes ourselves (no set -e surprises).
                                set +e

                                # Follow the build output in real time. --pod-running-timeout bounds
                                # the wait for scheduling + image pull, then streams until the kaniko
                                # container exits (no more 45-minute hang on a failed build).
                                kubectl logs -f "job/\${JOB}" -n "\${NS}" -c kaniko --pod-running-timeout=10m

                                # Authoritative result = the Job's terminal condition. Poll briefly
                                # to avoid a race right after the pod exits.
                                COMPLETE=""; FAILED_C=""; tries=0
                                while [ "\$tries" -lt 20 ]; do
                                  COMPLETE="\$(kubectl get job "\${JOB}" -n "\${NS}" -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null)"
                                  FAILED_C="\$(kubectl get job "\${JOB}" -n "\${NS}" -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}' 2>/dev/null)"
                                  if [ "\${COMPLETE}" = "True" ] || [ "\${FAILED_C}" = "True" ]; then break; fi
                                  tries=\$((tries+1)); sleep 3
                                done

                                if [ "\${COMPLETE}" = "True" ]; then
                                  echo "=== BUILD OK: \${JOB} ==="
                                  kubectl delete job "\${JOB}" -n "\${NS}" --ignore-not-found >/dev/null 2>&1
                                  exit 0
                                fi

                                echo "=== BUILD FAILED: \${JOB} — diagnostics ==="
                                kubectl describe job/"\${JOB}" -n "\${NS}" 2>/dev/null
                                for POD in \$(kubectl get pods -n "\${NS}" -l job-name="\${JOB}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null); do
                                  echo "--- describe pod \${POD} (State / Reason / Exit Code / Events) ---"
                                  kubectl describe pod "\${POD}" -n "\${NS}" 2>/dev/null
                                  echo "--- last 300 log lines: \${POD} (fallback if the live stream missed anything) ---"
                                  kubectl logs "\${POD}" -n "\${NS}" -c kaniko --tail=300 2>/dev/null
                                done
                                kubectl delete job "\${JOB}" -n "\${NS}" --ignore-not-found >/dev/null 2>&1
                                exit 1
                            """)
                            if (rc != 0) {
                                echo "❌ Kaniko build FAILED: ${svc.name}"
                                failed << svc.name
                            } else {
                                echo "✅ Kaniko build OK: ${svc.name}"
                            }
                        }

                        if (failed) {
                            error("Kaniko build failed for: ${failed.join(', ')} — see the per-service diagnostics above.")
                        }
                    }
                }
            }
        }

        // DEVOPS-06: Scan the freshly built images for known HIGH/CRITICAL CVEs
        // with Trivy before they are deployed. Best-effort: if Trivy is not
        // installed on the agent the stage is skipped (UNSTABLE, not FAILURE),
        // and findings are reported without breaking the build (`--exit-code 0`).
        // Tighten to `--exit-code 1` + remove catchError to gate deploys on CVEs.
        stage('Security Scan (Trivy)') {
            steps {
                script {
                    // Mirror the build matrix so every pushed image is scanned by its
                    // versioned tag (the unique, just-built artifact for this run).
                    def services = [
                        'frontend', 'api-gateway', 'authentication-service',
                        'booking-service', 'payment-service', 'flight-service',
                        'hotel-service', 'train-service', 'profile-service',
                        'pricing-service', 'notification-service', 'admin-service'
                    ]
                    catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE', message: 'Trivy scan failed or Trivy unavailable') {
                        if (sh(script: 'command -v trivy >/dev/null 2>&1', returnStatus: true) != 0) {
                            echo 'Trivy not found on agent; skipping image scan. Install Trivy to enable: https://aquasecurity.github.io/trivy'
                        } else {
                            for (def name : services) {
                                def image = "docker.io/${env.DOCKER_USER}/${name}:${env.BUILD_NUMBER}"
                                echo "Scanning ${image}"
                                // --exit-code 0 => report only (non-gating). Bump to 1 to fail on findings.
                                sh "trivy image --severity HIGH,CRITICAL --no-progress --exit-code 0 ${image}"
                            }
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

                            # All deployments use :latest + imagePullPolicy: Always. A plain
                            # `kubectl apply` won't re-pull when the manifest is unchanged, so we
                            # force a restart to roll out the freshly built (non-root) :latest images.
                            echo "Restarting deployments to pull the freshly built images..."
                            kubectl rollout restart deployment -n ticketing-app

                            echo "Waiting for rollouts to complete..."
                            for d in $(kubectl get deploy -n ticketing-app -o name); do
                                kubectl rollout status "$d" -n ticketing-app --timeout=180s || true
                            done

                            echo "Deployment Complete! Checking Pod status:"
                            kubectl get pods -n ticketing-app
                        '''
                    }
                }
            }
        }
    }
}
