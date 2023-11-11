import * as os from 'os'
import * as path from 'path'
import * as util from 'util'
import * as fs from 'fs'

import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'

const defaultKubectlVersion = '1.24.10'
const defaultKustomizeVersion = '5.0.0'
const defaultHelmVersion = '3.11.1'
const defaultHelmv2Version = '2.17.0'
const defaultKubevalVersion = '0.16.1'
const defaultKubeconformVersion = '0.5.0'
const defaultConftestVersion = '0.39.0'
const defaultYqVersion = '4.30.7'
const defaultRancherVersion = '2.7.0'
const defaultTiltVersion = '0.31.2'
const defaultSkaffoldVersion = '2.1.0'
const defaultKubeScoreVersion = '1.16.1'

interface Tool {
  name: string
  defaultVersion: string
  isArchived: boolean
  commandPathInPackage: string
}

const Tools: Tool[] = [
  {
    name: 'kubectl',
    defaultVersion: defaultKubectlVersion,
    isArchived: false,
    commandPathInPackage: 'kubectl'
  },
  {
    name: 'kustomize',
    defaultVersion: defaultKustomizeVersion,
    isArchived: true,
    commandPathInPackage: 'kustomize'
  },
  {
    name: 'helm',
    defaultVersion: defaultHelmVersion,
    isArchived: true,
    commandPathInPackage: 'linux-amd64/helm'
  },
  {
    name: 'helmv2',
    defaultVersion: defaultHelmv2Version,
    isArchived: true,
    commandPathInPackage: 'linux-amd64/helm'
  },
  {
    name: 'kubeval',
    defaultVersion: defaultKubevalVersion,
    isArchived: true,
    commandPathInPackage: 'kubeval'
  },
  {
    name: 'kubeconform',
    defaultVersion: defaultKubeconformVersion,
    isArchived: true,
    commandPathInPackage: 'kubeconform'
  },
  {
    name: 'conftest',
    defaultVersion: defaultConftestVersion,
    isArchived: true,
    commandPathInPackage: 'conftest'
  },
  {
    name: 'yq',
    defaultVersion: defaultYqVersion,
    isArchived: false,
    commandPathInPackage: 'yq_linux_amd64'
  },
  {
    name: 'rancher',
    defaultVersion: defaultRancherVersion,
    isArchived: true,
    commandPathInPackage: 'rancher-v%s/rancher'
  },
  {
    name: 'tilt',
    defaultVersion: defaultTiltVersion,
    isArchived: true,
    commandPathInPackage: 'tilt'
  },
  {
    name: 'skaffold',
    defaultVersion: defaultSkaffoldVersion,
    isArchived: false,
    commandPathInPackage: 'skaffold-linux-amd64'
  },
  {
    name: 'kube-score',
    defaultVersion: defaultKubeScoreVersion,
    isArchived: false,
    commandPathInPackage: 'kube-score'
  }
]

function getDownloadURL(
  commandName: string,
  version: string,
  arch: string
): string {
  switch (commandName) {
    case 'kubectl':
      return util.format(
        'https://storage.googleapis.com/kubernetes-release/release/v%s/bin/linux/%s/kubectl',
        version,
        arch
      )
    case 'kustomize':
      return util.format(
        'https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv%s/kustomize_v%s_linux_%s.tar.gz',
        version,
        version,
        arch
      )
    case 'helm':
      return util.format(
        'https://get.helm.sh/helm-v%s-linux-%s.tar.gz',
        version,
        arch
      )
    case 'helmv2':
      return util.format(
        'https://get.helm.sh/helm-v%s-linux-%s.tar.gz',
        version,
        arch
      )
    case 'kubeval':
      return util.format(
        'https://github.com/instrumenta/kubeval/releases/download/v%s/kubeval-linux-%s.tar.gz',
        version,
        arch
      )
    case 'kubeconform':
      return util.format(
        'https://github.com/yannh/kubeconform/releases/download/v%s/kubeconform-linux-%s.tar.gz',
        version,
        arch
      )
    case 'conftest':
      return util.format(
        'https://github.com/open-policy-agent/conftest/releases/download/v%s/conftest_%s_Linux_%s.tar.gz',
        version,
        version,
        arch
      )
    case 'yq':
      return util.format(
        'https://github.com/mikefarah/yq/releases/download/v%s/yq_linux_%s',
        version,
        arch
      )
    case 'rancher':
      return util.format(
        'https://github.com/rancher/cli/releases/download/v%s/rancher-linux-%s-v%s.tar.gz',
        version,
        arch,
        version
      )
    case 'tilt':
      return util.format(
        'https://github.com/tilt-dev/tilt/releases/download/v%s/tilt.%s.linux.%s.tar.gz',
        version,
        version,
        arch
      )
    case 'skaffold':
      return util.format(
        'https://github.com/GoogleContainerTools/skaffold/releases/download/v%s/skaffold-linux-%s',
        version,
        arch
      )
    case 'kube-score':
      return util.format(
        'https://github.com/zegl/kube-score/releases/download/v%s/kube-score_%s_linux_%s',
        version,
        version,
        arch
      )
    default:
      return ''
  }
}

async function downloadTool(
  version: string,
  tool: Tool,
  arch: string
): Promise<string> {
  let cachedToolPath = toolCache.find(tool.name, version)
  let commandPathInPackage = tool.commandPathInPackage
  let commandPath = ''

  if (!cachedToolPath) {
    const downloadURL = getDownloadURL(tool.name, version, arch)

    try {
      const packagePath = await toolCache.downloadTool(downloadURL)

      if (tool.isArchived) {
        const extractTarBaseDirPath = util.format(
          '%s_%s',
          packagePath,
          tool.name
        )

        fs.mkdirSync(extractTarBaseDirPath)

        const extractedDirPath = await toolCache.extractTar(
          packagePath,
          extractTarBaseDirPath
        )

        if (commandPathInPackage.indexOf('%s') > 0) {
          commandPathInPackage = util.format(commandPathInPackage, version)
        }
        commandPath = util.format(
          '%s/%s',
          extractedDirPath,
          commandPathInPackage
        )
      } else {
        commandPath = packagePath
      }
    } catch (exception) {
      throw new Error(`Download ${tool.name} Failed! (url: ${downloadURL})`)
    }
    cachedToolPath = await toolCache.cacheFile(
      commandPath,
      tool.name,
      tool.name,
      version
    )
    // eslint-disable-next-line no-console
    console.log(`${tool.name} version '${version}' has been cached`)
  } else {
    // eslint-disable-next-line no-console
    console.log(`Found in cache: ${tool.name} version '${version}'`)
  }

  const cachedCommand = path.join(cachedToolPath, tool.name)
  fs.chmodSync(cachedCommand, '777')
  return cachedCommand
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function run() {
  if (!os.type().match(/^Linux/)) {
    throw new Error('The action only support Linux OS!')
  }

  let failFast = true
  if (core.getInput('fail-fast', {required: false}).toLowerCase() === 'false') {
    failFast = false
  }

  let setupToolList: string[] = []
  const setupTools = core.getInput('setup-tools', {required: false}).trim()
  if (setupTools) {
    setupToolList = setupTools
      .split('\n')
      .map(function(x) {
        return x.trim()
      })
      .filter(x => x !== '')
  }

  for (const tool of Tools) {
    let toolPath = ''
    // By default, the action setup all supported Kubernetes tools, which mean
    // all tools can be setup when setuptools does not have any elements.
    if (setupToolList.length === 0 || setupToolList.includes(tool.name)) {
      let toolVersion = core
        .getInput(tool.name, {required: false})
        .toLowerCase()
      if (toolVersion && toolVersion.startsWith('v')) {
        toolVersion = toolVersion.substr(1)
      }
      if (!toolVersion) {
        toolVersion = tool.defaultVersion
      }
      try {
        const cachedPath = await downloadTool(toolVersion, tool, os.arch())
        core.addPath(path.dirname(cachedPath))
        toolPath = cachedPath
      } catch (exception) {
        if (failFast) {
          // eslint-disable-next-line no-console
          console.log(`Exiting immediately (fail fast) - [Reason] ${exception}`)
          process.exit(1)
        }
      }
    }
    core.setOutput(`${tool.name}-path`, toolPath)
  }
}

run().catch(core.setFailed)
