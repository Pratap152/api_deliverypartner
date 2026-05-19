pipeline {
    agent any

    environment {
        IMAGE_NAME = "pratap1371/api-deliverypartner"
        TAG = "v1.0.${BUILD_NUMBER}"
        AWS_REGION = "us-east-1"
        EKS_CLUSTER = "devops-eks-cluster"
    }

    stages {

        stage('Clone') {
            steps {
                git branch: 'dev',
                url: 'https://github.com/Pratap152/api_deliverypartner.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $IMAGE_NAME:$TAG .'
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {

                    sh '''
                    echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                    '''
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                sh 'docker push $IMAGE_NAME:$TAG'
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                aws eks update-kubeconfig --region $AWS_REGION --name $EKS_CLUSTER

                sed -i "s|image:.*|image: $IMAGE_NAME:$TAG|g" k8s/deployment.yaml

                kubectl apply -f k8s/deployment.yaml --validate=false

                kubectl apply -f k8s/service.yaml --validate=false

                kubectl rollout restart deployment api-deliverypartner
                '''
            }
        }
    }
}
