#!/bin/bash

# Help text
help()
{
    echo ""
    echo "          -o | --override               Override port forwarding values."
    echo "                                        Syntax:[local port] [remote host address] [remote port]"
    echo ""
}

# Set variables. These can be overwritten with the -o option.
localPort="3306"
remoteHost="db.random.region.rds.amazonaws.com"
remotePort="3306"
ssmUser="ec2-user"
ssmDoc="AWS-StartSSHSession"

# Get parameters
while [[ $1 != "" ]]
do
    case $1 in
        -o | --override  )          override=true
                                    shift
                                    localPort=$1
                                    shift
                                    remoteHost=$1
                                    shift
                                    remotePort=$1
                                    ;;
        -h | --help )               help
                                    exit
                                    ;;
        * )                         help
                                    exit 1
    esac
    shift
done

function checkDependencies {
    errorMessages=()

    echo -ne "Checking dependencies..................\r"

    # Check AWS CLI
    which aws
    aws=$(aws --version 2>&1)
    echo $aws
    if [[ $? != 0 ]]; then
        errorMessages+=('AWS CLI not found. Please install the latest version of AWS CLI.')
    else
        minVersion="1.16.213"
        version=$(echo $aws | cut -d' ' -f 1 | cut -d'/' -f 2)

        for i in {1..3}
        do
            x=$(echo "$version" | cut -d '.' -f $i)
            y=$(echo "$minVersion" | cut -d '.' -f $i)
            # if [[ $x < $y ]]; then
            #     errorMessages+=('Installed version of AWS CLI does not meet minimum version. Please install the latest version of AWS CLI.')
            #     break
            # fi
        done
    fi

    # Check Session Manager Plugin
    ssm=$(session-manager-plugin --version 2>&1)
    if [[ $? != 0 ]]; then
        errorMessages+=('AWS Session Manager Plugin not found. Please install the latest version of AWS Session Manager Plugin.')
    fi

    # If there are any error messages, print them and exit.
    if [[ $errorMessages ]]; then
        echo -ne "Checking dependencies..................Error"
        echo -ne "\n"
        for errorMessage in "${errorMessages[@]}"
        do
            echo "Failed dependency check"
            echo "======================="
            echo " - ${errorMessage}"
        done
        exit
    fi

    echo -ne "Checking dependencies..................Done"
    echo -ne "\n"
}

function setInstanceIdandAz {
    echo -ne "Getting available jump instance........\r"
    result=$(aws ec2 describe-instances --filter "Name=tag:InstanceRole,Values=bastion" --query "Reservations[].Instances[?State.Name == 'running'].{Id:InstanceId, Az:Placement.AvailabilityZone}[]" --output text)

    if [[ $result ]]; then
        azs=($(echo "$result" | cut -d $'\t' -f 1))
        instances=($(echo "$result" | cut -d $'\t' -f 2))
        
        instancesLength="${#instances[@]}"
        randomInstance=$(( $RANDOM % $instancesLength ))

        instanceId="${instances[$randomInstance]}"
        az="${azs[$randomInstance]}"
        echo -ne "Getting available jump instance........Done ($instanceId, $az)"
        echo -ne "\n"
    else
        echo "Could not find a running jump server. Please try again."
        exit
    fi

    
}

function loadSSHKey {
    # Generate SSH key
    echo -ne "Generating SSH key pair................\r"
    echo -e 'y\n' | ssh-keygen -t rsa -f temp -N '' > /dev/null 2>&1
    echo -ne "Generating SSH key pair................Done"
    echo -ne "\n"

    # Push SSH key to instance
    echo -ne "Pushing public key to instance.........\r"
    aws ec2-instance-connect send-ssh-public-key --region $AWS_DEFAULT_REGION --instance-id $instanceId --availability-zone $az --instance-os-user $ssmUser --ssh-public-key file://temp.pub > /dev/null 2>&1
    if [[ $? != 0 ]]; then
        echo -ne "Pushing public key to instance.........Error"
        echo -ne "\n"
        exit
    fi
    echo -ne "Pushing public key to instance.........Done"
    echo -ne "\n"
}

function tunnelToInstance {
    # Connect to instance
    echo -ne "Connecting to instance.................($localPort, $remoteHost, $remotePort)\r"
    ssh -i temp -N -f -M -S temp-ssh.sock -L $localPort:$remoteHost:$remotePort $ssmUser@$instanceId -o "UserKnownHostsFile=/dev/null" -o "StrictHostKeyChecking=no" -o ProxyCommand="aws ssm start-session --target %h --document-name $ssmDoc --parameters portNumber=%p --region $AWS_DEFAULT_REGION"
    if [[ $? != 0 ]]; then
        echo -ne "Connecting to instance.................Error"
        echo -ne "\n"
        exit
    fi
    echo -ne "Connecting to instance.................Done\r"
    echo -ne "\n"

    read -rsn1 -p "Press any key to close session."; echo
    ssh -O exit -S temp-ssh.sock *
}

# Check for dependencies
checkDependencies

# Get random running instance with ServerRole:JumpServers tag
setInstanceIdandAz

# Load SSH key pair
loadSSHKey

# Connect to instance
tunnelToInstance
