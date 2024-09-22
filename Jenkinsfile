@Library("teckdigital") _
def appName = "muse"
def localBranchToGitopsValuesPath = [
    'main': 'muse/deployment.yml',
]

pipeline {
   agent {
    kubernetes {
        inheritFrom "kaniko-template"
    }
  }
    
    stages {
        stage('Build and Tag Image') {
            steps {
                container('kaniko') {
                    script {
                        buildDockerImage(additionalImageTags: ["latest"], imageName: "tpausl/muse")
                    }
                }
            }
        }

        stage('Update GitOps') {
            when {
                expression {
                    return localBranchToGitopsValuesPath.containsKey(getLocalBranchName())
                }
            }
            steps {
                script {
                    def valuesPath = localBranchToGitopsValuesPath[getLocalBranchName()]
                    updateGitops(appName: appName, valuesPath: valuesPath, credentialsId: "tpausl-github-user", gitOpsRepo: "https://github.com/tpausl/gitops.git", fileTypeToChange: "deployment", containerName: "print-assist")
                }
            }
        }
    }
}